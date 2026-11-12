"""REST API нотаток поверх тих самих selectors і services, що й HTML-views.

Код — з Django-книги (notes_chat_app/notes_app/api.py), доповнений до повного CRUD.
View не робить ORM-запитів сам: читання — selectors, зміни — services.
Кожен запит бачить лише нотатки поточного користувача (захист від IDOR).
Урок 44: записник для фільтра й поля `notebook` — теж через selectors (notebooks_owned_by, find_owned),
а не `Notebook.objects.filter(user=...)` тут; `Model.objects.none()` лишились — вони не роблять запитів.
Теорія: https://nikoriakviktor.github.io/notes_chat_app/06_application_architecture/drf_rest_api_full/
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from . import selectors, services
from .models import Note, Notebook


class NoteOutputSerializer(serializers.ModelSerializer):
    """Що бачить клієнт: явний список полів, без user."""
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    notebook = serializers.CharField(source="notebook.title", default=None, read_only=True)
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")

    class Meta:
        model = Note
        fields = ["id", "title", "content", "priority", "priority_label", "is_pinned",
                  "notebook", "tags", "updated_at"]


class NoteInputSerializer(serializers.Serializer):
    """Що клієнт може надіслати. Власника задає сервер, а не клієнт."""
    title = serializers.CharField(max_length=200)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    priority = serializers.ChoiceField(choices=Note.PRIORITY_CHOICES, default=Note.PRIORITY_LOW)
    is_pinned = serializers.BooleanField(required=False, default=False)
    notebook = serializers.PrimaryKeyRelatedField(queryset=Notebook.objects.none(), required=False,
                                                  allow_null=True, default=None)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # як NoteForm(user=...): записник можна вибрати лише зі своїх
        request = self.context.get("request")
        if request is not None:
            self.fields["notebook"].queryset = selectors.notebooks_owned_by(request.user)


# ViewSet не знає серіалізаторів сам — описуємо їх для OpenAPI-схеми явно
@extend_schema_view(
    list=extend_schema(responses=NoteOutputSerializer(many=True), parameters=[
        OpenApiParameter("search", str, description="пошук у заголовку й тексті"),
        OpenApiParameter("notebook", int, description="id свого записника"),
    ]),
    retrieve=extend_schema(responses=NoteOutputSerializer),
    create=extend_schema(request=NoteInputSerializer, responses={201: NoteOutputSerializer}),
    partial_update=extend_schema(request=NoteInputSerializer, responses=NoteOutputSerializer),
    destroy=extend_schema(responses={204: None}),
    pin=extend_schema(request=None, responses=NoteOutputSerializer),
)
class NoteViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Note.objects.none()   # лише для схеми: тип {id} у шляху; дані беруть selectors

    def _get_note(self, request, pk):
        """Читати: свою нотатку або нотатку своєї групи (урок 40). Чужа — 404, ніби її немає."""
        try:
            return selectors.get_note_detail(request.user, pk)
        except Note.DoesNotExist:
            raise NotFound("Нотатку не знайдено.")

    def _get_own_note(self, request, pk):
        """Змінювати й видаляти: лише автор. Нотатка групи видима учаснику, але не його — 403.

        Урок 40: після спільного доступу через групи get_note_detail віддає і нотатки групи.
        HTML-views перевіряли автора, а API — ні: учасник групи через API міняв і видаляв чужі нотатки.
        """
        note = self._get_note(request, pk)
        if note.user_id != request.user.id:
            raise PermissionDenied("Змінювати й видаляти нотатку може лише її автор.")
        return note

    def _input(self, request, **kwargs):
        data = NoteInputSerializer(data=request.data, context={"request": request}, **kwargs)
        data.is_valid(raise_exception=True)
        return data.validated_data

    def list(self, request):
        params = request.query_params
        notebook = None
        if "notebook" in params:                       # ?notebook=<id> — лише свій записник
            notebook = selectors.find_owned(selectors.notebooks_owned_by, request.user, params["notebook"])
            if notebook is None:
                raise NotFound("Записник не знайдено.")
        notes = selectors.get_user_notes(request.user, notebook=notebook, search=params.get("search"))
        return Response(NoteOutputSerializer(notes, many=True).data)

    def retrieve(self, request, pk=None):
        return Response(NoteOutputSerializer(self._get_note(request, pk)).data)

    def create(self, request):
        note = services.create_note(user=request.user, **self._input(request))
        return Response(NoteOutputSerializer(note).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        note = self._get_own_note(request, pk)
        note = services.update_note(note, **self._input(request, partial=True))
        return Response(NoteOutputSerializer(note).data)

    def destroy(self, request, pk=None):
        services.delete_note(self._get_own_note(request, pk))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def pin(self, request, pk=None):
        note = services.toggle_pin_note(self._get_own_note(request, pk))
        return Response(NoteOutputSerializer(note).data)
