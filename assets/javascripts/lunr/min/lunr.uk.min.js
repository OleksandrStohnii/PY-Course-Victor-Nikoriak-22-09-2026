/*!
 * lunr.uk — українська мова для пошуку Material for MkDocs (lunr 2.x).
 *
 * Легкий суфіксний стемер: зводить словоформи до спільної основи
 * (файл, файли, файлів, файлами → «файл»), щоб пошук знаходив усі відмінки.
 * Слова не кирилицею (FileNotFoundError, json.load, try) не чіпає — їх обробляє
 * англійський стемер lunr, коли пошук працює як lunr.multiLanguage("en", "uk").
 *
 * Підключає tools/mkdocs_hooks/uk_search.py. Перевірка: tools/mkdocs_hooks/test_lunr_uk.html.
 */
;(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory)
  } else if (typeof exports === "object") {
    module.exports = factory()
  } else {
    factory()(root.lunr)
  }
}(this, function () {
  return function (lunr) {
    if (typeof lunr === "undefined") {
      throw new Error("Lunr is not present. Please include / require Lunr before this script.")
    }
    if (typeof lunr.trimmerSupport === "undefined") {
      throw new Error("Lunr stemmer support is not present. Please include / require Lunr stemmer support before this script.")
    }

    lunr.uk = function () {
      this.pipeline.reset()
      this.pipeline.add(lunr.uk.trimmer, lunr.uk.stopWordFilter, lunr.uk.stemmer)
      if (this.searchPipeline) {
        this.searchPipeline.reset()
        this.searchPipeline.add(lunr.uk.stemmer)
      }
    }

    lunr.uk.wordCharacters = "Ѐ-ӿ"
    lunr.uk.trimmer = lunr.trimmerSupport.generateTrimmer(lunr.uk.wordCharacters)
    lunr.Pipeline.registerFunction(lunr.uk.trimmer, "trimmer-uk")

    var VOWEL = /[аеиіїоуюяє]/
    var UKRAINIAN = /^[а-яіїєґ]+$/
    var APOSTROPHES = /['’ʼ`]/g

    // Закінчення іменників, прикметників, дієприкметників і дієслів.
    // Шукається найдовше, тому список сортується за довжиною.
    var ENDINGS = [
      // іменники
      "а", "я", "о", "е", "є", "у", "ю", "и", "і", "ї", "й",
      "ам", "ям", "ом", "ем", "єм", "ах", "ях", "ою", "ею", "єю",
      "ами", "ями", "ів", "їв", "ей", "ій", "ію", "ія", "ії",
      "еві", "єві", "іям", "іях", "іями",          // без "ові": текстові → текстов, не текст
      "ість", "ості", "істю", "остей", "остям", "остях", "остями",
      // прикметники й дієприкметники
      "ий", "ого", "его", "ього", "ому", "ему", "ьому",
      "им", "ими", "их", "іх", "ої", "ую", "юю", "ая", "яя",
      // дієслова: інфінітив, теперішній час, минулий час, наказовий спосіб
      "ти", "ати", "яти", "ити", "іти", "ути",
      "ть", "ать", "ять", "ить", "іть", "уть", "ють",
      "аю", "яю", "ую", "ає", "яє", "ує", "ають", "яють", "ують",
      "єш", "еш", "иш", "іш", "аєш", "яєш", "уєш",
      "ємо", "емо", "имо", "імо", "аємо", "яємо", "уємо",
      "єте", "ете", "ите", "іте", "аєте", "яєте", "уєте",
      "ав", "ала", "ало", "али", "яв", "яла", "яло", "яли",
      "ив", "ила", "ило", "или", "іла", "іло", "іли",
      "ай", "айте", "йте",
      // дієприслівники
      "ючи", "учи", "ачи", "ячи", "вши"
    ].sort(function (a, b) { return b.length - a.length })

    // Закінчення, що збігаються з кінцем частих іменників: режим, режими → «реж».
    // Зрізаємо їх лише з довших слів: текстовим → текстов.
    var LONG_STEM_ONLY = { "им": 4, "ими": 4 }

    lunr.uk.stem = function (word) {
      var w = word.replace(APOSTROPHES, "")            // пам'ять = памʼять = пам’ять
      if (!UKRAINIAN.test(w)) {
        return word                                    // латиниця, код, числа — як є
      }
      var vowel = VOWEL.exec(w)
      if (!vowel) {
        return w
      }
      var minStem = Math.max(vowel.index + 1, 2)       // основа не коротша за склад до першої голосної

      // зворотні дієслова: навчатися, навчаюсь, читається
      if (/(ся|сь)$/.test(w) && w.length - 2 >= 3) {
        w = w.slice(0, -2)
        if (/ть$/.test(w) && w.length - 2 >= minStem) {
          w = w.slice(0, -2)
        }
      }

      var stripped = ""
      for (var i = 0; i < ENDINGS.length; i++) {
        var ending = ENDINGS[i]
        var min = Math.max(minStem, LONG_STEM_ONLY[ending] || 0)
        if (w.length - ending.length >= min && w.slice(-ending.length) === ending) {
          w = w.slice(0, -ending.length)
          stripped = ending
          break
        }
      }

      if (/ь$/.test(w) && w.length > 2) {
        w = w.slice(0, -1)                             // значень → значен
      }
      if (/нн$/.test(w)) {
        w = w.slice(0, -1)                             // значення → значенн → значен
      }
      if (!stripped && w.length >= 5) {                // голосна, що випадає
        if (/[^аеиіїоуюяє]ец$/.test(w)) {
          w = w.slice(0, -2) + "ц"                     // гравець → гравц (як гравця)
        } else if (/[^аеиіїоуюяє]ок$/.test(w)) {
          w = w.slice(0, -2) + "к"                     // виняток → винятк (як винятки)
        }
      }
      return w
    }

    lunr.uk.stemmer = function (token) {
      return token.update(function (word) {
        return lunr.uk.stem(word)
      })
    }
    lunr.Pipeline.registerFunction(lunr.uk.stemmer, "stemmer-uk")

    lunr.uk.stopWordFilter = lunr.generateStopWordFilter((
      "а але або аж б би бо в вже ви від він вона воно вони все всі де до же ж з за зі із " +
      "і й її їх його коли ми на над не ні о об от під по при про та так те ти то той ту " +
      "у це ці цей ця чи що щоб я як який яка яке які"
    ).split(" "))
    lunr.Pipeline.registerFunction(lunr.uk.stopWordFilter, "stopWordFilter-uk")

    // Material дописує `*` до кожного слова запиту (файли → файли*), а lunr для слів
    // із `*` вимикає конвеєр — запит не стемиться і не збігається з основами в індексі.
    // Тут основу перед `*` проганяємо тим самим конвеєром пошуку: файли* → файл*.
    // Основа — префікс слова, тож збігів стає лише більше.
    if (!lunr.Index.prototype.query.stemsWildcards) {
      var query = lunr.Index.prototype.query
      lunr.Index.prototype.query = function (fn) {
        var pipeline = this.pipeline
        return query.call(this, function (q) {
          var clause = q.clause
          q.clause = function (c) {
            if (c.usePipeline === false && typeof c.term === "string" && /^[^*]+\*$/.test(c.term)) {
              var terms = pipeline.runString(c.term.slice(0, -1))
              if (terms.length === 1 && terms[0]) {
                c.term = terms[0] + "*"
              }
            }
            return clause.call(this, c)
          }
          fn.call(q, q)
        })
      }
      lunr.Index.prototype.query.stemsWildcards = true
    }
  }
}))
