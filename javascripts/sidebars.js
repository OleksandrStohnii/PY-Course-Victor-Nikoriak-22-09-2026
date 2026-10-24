/* Кнопки в шапці книги: згорнути / розгорнути ліве меню і правий зміст.
   Стан зберігається в localStorage, тож не скидається при переході між сторінками. */
(function () {
  var PANELS = [
    { key: "nav", cls: "sidebar-hide-nav", icon: "☰", show: "Показати меню", hide: "Сховати меню" },
    { key: "toc", cls: "sidebar-hide-toc", icon: "≡", show: "Показати зміст", hide: "Сховати зміст" }
  ];

  function load(key) {
    try { return localStorage.getItem("sidebar-" + key) === "hidden"; } catch (e) { return false; }
  }
  function save(key, hidden) {
    try { localStorage.setItem("sidebar-" + key, hidden ? "hidden" : "shown"); } catch (e) { /* приватний режим */ }
  }

  function update(button, panel) {
    var hidden = document.body.classList.contains(panel.cls);
    var label = hidden ? panel.show : panel.hide;
    button.setAttribute("aria-pressed", hidden ? "true" : "false");
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function init() {
    var header = document.querySelector(".md-header__inner");
    if (!header || header.querySelector(".sidebar-toggle")) return;
    var anchor = header.querySelector(".md-search") || header.querySelector(".md-header__source");

    PANELS.forEach(function (panel) {
      if (load(panel.key)) document.body.classList.add(panel.cls);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sidebar-toggle sidebar-toggle--" + panel.key;
      button.innerHTML = '<span aria-hidden="true">' + panel.icon + "</span>" +
        '<span class="sidebar-toggle__text">' + (panel.key === "nav" ? "Меню" : "Зміст") + "</span>";
      button.addEventListener("click", function () {
        var hidden = document.body.classList.toggle(panel.cls);
        save(panel.key, hidden);
        update(button, panel);
      });
      update(button, panel);
      header.insertBefore(button, anchor);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
