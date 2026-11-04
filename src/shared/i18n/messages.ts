import { EDITOR_MESSAGES } from './editor-messages';
import { EDITOR_MORE } from './editor-more';
import { EDITOR_FINAL } from './editor-final';
import { HELP_MESSAGES } from './help-messages';
import { REMAINING_MESSAGES } from './remaining-messages';
import { EXTRA_MESSAGES } from './extra-messages';
import { TUTORIAL_MESSAGES } from './tutorial-messages';
// Columns: English | Russian | Simplified Chinese | Polish | Italian | Spanish | Dutch | French | German.
const rows = String.raw`
Document library|Библиотека документов|文档库|Biblioteka dokumentów|Libreria documenti|Biblioteca de documentos|Documentbibliotheek|Bibliothèque de documents|Dokumentenbibliothek
My documents|Мои документы|我的文档|Moje dokumenty|I miei documenti|Mis documentos|Mijn documenten|Mes documents|Meine Dokumente
Documents|Документы|文档|Dokumenty|Documenti|Documentos|Documenten|Documents|Dokumente
Document|Документ|文档|Dokument|Documento|Documento|Document|Document|Dokument
Library|Библиотека|资源库|Biblioteka|Libreria|Biblioteca|Bibliotheek|Bibliothèque|Bibliothek
Ready-made layouts|Готовые макеты|现成模板|Gotowe szablony|Modelli pronti|Diseños listos|Kant-en-klare ontwerpen|Modèles prêts à l’emploi|Fertige Vorlagen
Choose a starting point. Every layout is fully editable.|Выберите основу. Каждый макет можно полностью изменить.|选择起点，每个模板均可编辑。|Wybierz punkt wyjścia. Każdy szablon można w pełni edytować.|Scegli un punto di partenza. Ogni modello è completamente modificabile.|Elige un punto de partida. Todos los diseños son editables.|Kies een startpunt. Elk ontwerp is volledig bewerkbaar.|Choisissez un point de départ. Chaque modèle est entièrement modifiable.|Wählen Sie eine Grundlage. Jede Vorlage ist vollständig bearbeitbar.
Blank document|Пустой документ|空白文档|Pusty dokument|Documento vuoto|Documento en blanco|Leeg document|Document vierge|Leeres Dokument
Starting layout|Начальный макет|初始模板|Szablon początkowy|Modello iniziale|Diseño inicial|Startontwerp|Modèle de départ|Ausgangsvorlage
Use this layout|Использовать макет|使用此模板|Użyj szablonu|Usa questo modello|Usar este diseño|Dit ontwerp gebruiken|Utiliser ce modèle|Vorlage verwenden
Search layouts|Поиск макетов|搜索模板|Szukaj szablonów|Cerca modelli|Buscar diseños|Ontwerpen zoeken|Rechercher des modèles|Vorlagen suchen
Category|Категория|类别|Kategoria|Categoria|Categoría|Categorie|Catégorie|Kategorie
All categories|Все категории|所有类别|Wszystkie kategorie|Tutte le categorie|Todas las categorías|Alle categorieën|Toutes les catégories|Alle Kategorien
business|Бизнес|商务|Biznes|Attività|Negocios|Zakelijk|Entreprise|Geschäftlich
marketing|Маркетинг|营销|Marketing|Marketing|Marketing|Marketing|Marketing|Marketing
events|Мероприятия|活动|Wydarzenia|Eventi|Eventos|Evenementen|Événements|Veranstaltungen
personal|Личное|个人|Osobiste|Personale|Personal|Persoonlijk|Personnel|Persönlich
Business card|Визитка|名片|Wizytówka|Biglietto da visita|Tarjeta de visita|Visitekaartje|Carte de visite|Visitenkarte
Tri-fold brochure|Буклет в три сложения|三折页宣传册|Ulotka składana na trzy|Dépliant a tre ante|Folleto tríptico|Drieluikfolder|Dépliant trois volets|Dreifachfaltbroschüre
Presentation|Презентация|演示文稿|Prezentacja|Presentazione|Presentación|Presentatie|Présentation|Präsentation
Business letter|Деловое письмо|商务信函|Pismo firmowe|Lettera commerciale|Carta comercial|Zakelijke brief|Lettre professionnelle|Geschäftsbrief
Invoice|Счёт|发票|Faktura|Fattura|Factura|Factuur|Facture|Rechnung
Business proposal|Коммерческое предложение|商业提案|Oferta handlowa|Proposta commerciale|Propuesta comercial|Zakelijk voorstel|Proposition commerciale|Geschäftsangebot
Project report|Отчёт о проекте|项目报告|Raport z projektu|Rapporto di progetto|Informe del proyecto|Projectverslag|Rapport de projet|Projektbericht
Resume|Резюме|简历|Życiorys|Curriculum|Currículum|Cv|CV|Lebenslauf
Certificate|Сертификат|证书|Certyfikat|Certificato|Certificado|Certificaat|Certificat|Zertifikat
Event ticket|Билет на мероприятие|活动门票|Bilet na wydarzenie|Biglietto per evento|Entrada para evento|Evenementticket|Billet d’événement|Veranstaltungsticket
Name badge|Бейдж|姓名牌|Identyfikator|Badge nominativo|Credencial|Naambadge|Badge nominatif|Namensschild
Promotional flyer|Рекламный флаер|宣传单|Ulotka reklamowa|Volantino promozionale|Folleto promocional|Promotieflyer|Flyer promotionnel|Werbeflyer
Event poster|Афиша|活动海报|Plakat wydarzenia|Manifesto evento|Cartel de evento|Evenementposter|Affiche d’événement|Veranstaltungsplakat
Invitation|Приглашение|邀请函|Zaproszenie|Invito|Invitación|Uitnodiging|Invitation|Einladung
Menu|Меню|菜单|Menu|Menù|Menú|Menu|Menu|Speisekarte
Price list|Прайс-лист|价目表|Cennik|Listino prezzi|Lista de precios|Prijslijst|Liste de prix|Preisliste
Weekly planner|Планер на неделю|周计划表|Plan tygodnia|Agenda settimanale|Planificador semanal|Weekplanner|Planning hebdomadaire|Wochenplaner
Monthly calendar|Календарь на месяц|月历|Kalendarz miesięczny|Calendario mensile|Calendario mensual|Maandkalender|Calendrier mensuel|Monatskalender
Gift voucher|Подарочный сертификат|礼品券|Bon podarunkowy|Buono regalo|Vale de regalo|Cadeaubon|Bon cadeau|Geschenkgutschein
Shipping label|Адресная этикетка|快递标签|Etykieta adresowa|Etichetta di spedizione|Etiqueta de envío|Verzendlabel|Étiquette d’expédition|Versandetikett
Front|Лицевая сторона|正面|Przód|Fronte|Anverso|Voorkant|Recto|Vorderseite
Back|Назад|返回|Wstecz|Indietro|Atrás|Terug|Retour|Zurück
YOUR COMPANY|ВАША КОМПАНИЯ|您的公司|TWOJA FIRMA|LA TUA AZIENDA|TU EMPRESA|UW BEDRIJF|VOTRE ENTREPRISE|IHR UNTERNEHMEN
YOUR NAME|ВАШЕ ИМЯ|您的姓名|TWOJE IMIĘ|IL TUO NOME|TU NOMBRE|UW NAAM|VOTRE NOM|IHR NAME
Your profession|Ваша профессия|您的职业|Twój zawód|La tua professione|Tu profesión|Uw beroep|Votre profession|Ihr Beruf
Your next great idea starts here.|Ваша следующая идея начинается здесь.|您的下一个创意从这里开始。|Twój kolejny pomysł zaczyna się tutaj.|La tua prossima idea nasce qui.|Tu próxima gran idea empieza aquí.|Uw volgende grote idee begint hier.|Votre prochaine idée commence ici.|Ihre nächste große Idee beginnt hier.
YOUR NEXT BIG IDEA|ВАША НОВАЯ ИДЕЯ|您的下一个创意|TWÓJ NOWY POMYSŁ|LA TUA PROSSIMA IDEA|TU PRÓXIMA GRAN IDEA|UW VOLGENDE GROTE IDEE|VOTRE PROCHAINE IDÉE|IHRE NÄCHSTE GROSSE IDEE
The challenge and the solution|Задача и решение|挑战与解决方案|Wyzwanie i rozwiązanie|La sfida e la soluzione|El reto y la solución|De uitdaging en de oplossing|Le défi et la solution|Die Aufgabe und die Lösung
Next steps|Следующие шаги|后续步骤|Następne kroki|Prossimi passi|Próximos pasos|Volgende stappen|Prochaines étapes|Nächste Schritte
Add your key message and supporting details.|Добавьте основную мысль и пояснения.|添加您的核心信息和相关详情。|Dodaj główny przekaz i szczegóły.|Aggiungi il messaggio principale e i dettagli.|Añade tu mensaje principal y los detalles.|Voeg uw kernboodschap en details toe.|Ajoutez votre message principal et les détails.|Ergänzen Sie Ihre Kernaussage und Details.
Discover what is possible|Откройте возможности|探索更多可能|Odkryj możliwości|Scopri le possibilità|Descubre las posibilidades|Ontdek de mogelijkheden|Découvrez les possibilités|Entdecken Sie die Möglichkeiten
About us|О нас|关于我们|O nas|Chi siamo|Sobre nosotros|Over ons|À propos|Über uns
Our services|Наши услуги|我们的服务|Nasze usługi|I nostri servizi|Nuestros servicios|Onze diensten|Nos services|Unsere Leistungen
Contact us|Свяжитесь с нами|联系我们|Skontaktuj się z nami|Contattaci|Contáctanos|Neem contact op|Contactez-nous|Kontaktieren Sie uns
CERTIFICATE|СЕРТИФИКАТ|证书|CERTYFIKAT|CERTIFICATO|CERTIFICADO|CERTIFICAAT|CERTIFICAT|ZERTIFIKAT
This certificate is awarded to|Настоящий сертификат выдан|本证书授予|Niniejszy certyfikat otrzymuje|Il presente certificato è assegnato a|Este certificado se otorga a|Dit certificaat wordt toegekend aan|Ce certificat est décerné à|Dieses Zertifikat wird verliehen an
PARTICIPANT NAME|ИМЯ УЧАСТНИКА|参与者姓名|IMIĘ UCZESTNIKA|NOME DEL PARTECIPANTE|NOMBRE DEL PARTICIPANTE|NAAM DEELNEMER|NOM DU PARTICIPANT|NAME DER TEILNEHMENDEN PERSON
For successful participation and achievement.|За успешное участие и достижения.|表彰积极参与及取得的成绩。|Za udział i osiągnięcia.|Per la partecipazione e i risultati ottenuti.|Por su participación y sus logros.|Voor succesvolle deelname en prestaties.|Pour sa participation et ses réalisations.|Für erfolgreiche Teilnahme und Leistungen.
Date __________    Signature __________|Дата __________    Подпись __________|日期 __________    签名 __________|Data __________    Podpis __________|Data __________    Firma __________|Fecha __________    Firma __________|Datum __________    Handtekening __________|Date __________    Signature __________|Datum __________    Unterschrift __________
RECIPIENT NAME|ИМЯ ПОЛУЧАТЕЛЯ|收件人姓名|IMIĘ ODBIORCY|NOME DESTINATARIO|NOMBRE DEL DESTINATARIO|NAAM ONTVANGER|NOM DU DESTINATAIRE|NAME DER EMPFANGENDEN PERSON
Street, building, apartment\nCity, postal code\nCountry|Улица, дом, квартира\nГород, индекс\nСтрана|街道、楼号、房间号\n城市、邮编\n国家|Ulica, budynek, mieszkanie\nMiasto, kod pocztowy\nKraj|Via, numero, appartamento\nCittà, codice postale\nPaese|Calle, número, piso\nCiudad, código postal\nPaís|Straat, huisnummer, appartement\nPlaats, postcode\nLand|Rue, numéro, appartement\nVille, code postal\nPays|Straße, Hausnummer, Wohnung\nOrt, Postleitzahl\nLand
A moment worth celebrating|Событие, которое стоит отметить|值得庆祝的时刻|Chwila warta świętowania|Un momento da festeggiare|Un momento para celebrar|Een moment om te vieren|Un moment à célébrer|Ein Anlass zum Feiern
Date · Time · Location|Дата · Время · Место|日期 · 时间 · 地点|Data · Godzina · Miejsce|Data · Ora · Luogo|Fecha · Hora · Lugar|Datum · Tijd · Locatie|Date · Heure · Lieu|Datum · Uhrzeit · Ort
Monday|Понедельник|星期一|Poniedziałek|Lunedì|Lunes|Maandag|Lundi|Montag
Tuesday|Вторник|星期二|Wtorek|Martedì|Martes|Dinsdag|Mardi|Dienstag
Wednesday|Среда|星期三|Środa|Mercoledì|Miércoles|Woensdag|Mercredi|Mittwoch
Thursday|Четверг|星期四|Czwartek|Giovedì|Jueves|Donderdag|Jeudi|Donnerstag
Friday|Пятница|星期五|Piątek|Venerdì|Viernes|Vrijdag|Vendredi|Freitag
Saturday|Суббота|星期六|Sobota|Sabato|Sábado|Zaterdag|Samedi|Samstag
Sunday|Воскресенье|星期日|Niedziela|Domenica|Domingo|Zondag|Dimanche|Sonntag
Invoice number · Date · Customer|Номер счёта · Дата · Клиент|发票编号 · 日期 · 客户|Numer faktury · Data · Klient|Numero fattura · Data · Cliente|Número de factura · Fecha · Cliente|Factuurnummer · Datum · Klant|Numéro de facture · Date · Client|Rechnungsnummer · Datum · Kunde
Thoughtfully selected for you|Подобрано специально для вас|为您精心挑选|Wybrane specjalnie dla Ciebie|Selezionato per te|Seleccionado para ti|Speciaal voor u geselecteerd|Sélectionné pour vous|Für Sie ausgewählt
Description|Описание|描述|Opis|Descrizione|Descripción|Beschrijving|Description|Beschreibung
Quantity|Количество|数量|Ilość|Quantità|Cantidad|Aantal|Quantité|Menge
Price|Цена|价格|Cena|Prezzo|Precio|Prijs|Prix|Preis
Total|Итого|总计|Razem|Totale|Total|Totaal|Total|Gesamt
Your product or service|Ваш товар или услуга|您的产品或服务|Twój produkt lub usługa|Il tuo prodotto o servizio|Tu producto o servicio|Uw product of dienst|Votre produit ou service|Ihr Produkt oder Ihre Leistung
Total: 200.00|Итого: 200.00|总计：200.00|Razem: 200.00|Totale: 200.00|Total: 200.00|Totaal: 200.00|Total : 200.00|Gesamt: 200.00
Profile|Профиль|个人简介|Profil|Profilo|Perfil|Profiel|Profil|Profil
Experience|Опыт работы|工作经历|Doświadczenie|Esperienza|Experiencia|Ervaring|Expérience|Berufserfahrung
Education|Образование|教育背景|Wykształcenie|Istruzione|Formación|Opleiding|Formation|Ausbildung
Skills|Навыки|技能|Umiejętności|Competenze|Habilidades|Vaardigheden|Compétences|Fähigkeiten
MAKE IT HAPPEN|ПОРА ДЕЙСТВОВАТЬ|让想法成为现实|ZREALIZUJ TO|REALIZZALO|HAZLO REALIDAD|MAAK HET WAAR|PASSEZ À L’ACTION|MACHEN SIE ES MÖGLICH
Join us|Присоединяйтесь|加入我们|Dołącz do nas|Unisciti a noi|Únete|Doe mee|Rejoignez-nous|Seien Sie dabei
Overview|Обзор|概述|Przegląd|Panoramica|Resumen|Overzicht|Vue d’ensemble|Überblick
Details|Подробности|详情|Szczegóły|Dettagli|Detalles|Details|Détails|Einzelheiten
Report details|Подробный отчёт|详细报告|Szczegóły raportu|Dettagli del rapporto|Detalles del informe|Rapportdetails|Détails du rapport|Berichtsdetails
Results and next steps|Результаты и дальнейшие действия|结果和后续步骤|Wyniki i kolejne kroki|Risultati e prossimi passi|Resultados y próximos pasos|Resultaten en vervolgstappen|Résultats et prochaines étapes|Ergebnisse und nächste Schritte
Metric|Показатель|指标|Wskaźnik|Indicatore|Indicador|Maatstaf|Indicateur|Kennzahl
Target|План|目标|Cel|Obiettivo|Objetivo|Doel|Objectif|Ziel
Result|Результат|结果|Wynik|Risultato|Resultado|Resultaat|Résultat|Ergebnis
Your metric|Ваш показатель|您的指标|Twój wskaźnik|Il tuo indicatore|Tu indicador|Uw maatstaf|Votre indicateur|Ihre Kennzahl
Stamp studio|Студия штампов|印章工作室|Studio pieczątek|Studio timbri|Estudio de sellos|Stempelstudio|Atelier de tampons|Stempelstudio
Stamps|Штампы|印章|Pieczątki|Timbri|Sellos|Stempels|Tampons|Stempel
Create a stamp|Создать штамп|创建印章|Utwórz pieczątkę|Crea un timbro|Crear un sello|Stempel maken|Créer un tampon|Stempel erstellen
My stamp|Мой штамп|我的印章|Moja pieczątka|Il mio timbro|Mi sello|Mijn stempel|Mon tampon|Mein Stempel
Round seal|Круглая печать|圆形印章|Pieczęć okrągła|Timbro rotondo|Sello redondo|Ronde stempel|Tampon rond|Runder Stempel
Oval seal|Овальная печать|椭圆形印章|Pieczęć owalna|Timbro ovale|Sello ovalado|Ovale stempel|Tampon ovale|Ovaler Stempel
Rectangular stamp|Прямоугольный штамп|矩形印章|Pieczątka prostokątna|Timbro rettangolare|Sello rectangular|Rechthoekige stempel|Tampon rectangulaire|Rechteckiger Stempel
Approved|Согласовано|已批准|Zatwierdzono|Approvato|Aprobado|Goedgekeurd|Approuvé|Genehmigt
APPROVED|СОГЛАСОВАНО|已批准|ZATWIERDZONO|APPROVATO|APROBADO|GOEDGEKEURD|APPROUVÉ|GENEHMIGT
Paid|Оплачено|已付款|Zapłacono|Pagato|Pagado|Betaald|Payé|Bezahlt
PAID|ОПЛАЧЕНО|已付款|ZAPŁACONO|PAGATO|PAGADO|BETAALD|PAYÉ|BEZAHLT
Received|Получено|已收到|Otrzymano|Ricevuto|Recibido|Ontvangen|Reçu|Eingegangen
RECEIVED|ПОЛУЧЕНО|已收到|OTRZYMANO|RICEVUTO|RECIBIDO|ONTVANGEN|REÇU|EINGEGANGEN
Copy|Копия|副本|Kopia|Copia|Copia|Kopie|Copie|Kopie
COPY|КОПИЯ|副本|KOPIA|COPIA|COPIA|KOPIE|COPIE|KOPIE
Confidential|Конфиденциально|机密|Poufne|Riservato|Confidencial|Vertrouwelijk|Confidentiel|Vertraulich
CONFIDENTIAL|КОНФИДЕНЦИАЛЬНО|机密|POUFNE|RISERVATO|CONFIDENCIAL|VERTROUWELIJK|CONFIDENTIEL|VERTRAULICH
Draft|Черновик|草稿|Szkic|Bozza|Borrador|Concept|Brouillon|Entwurf
DRAFT|ЧЕРНОВИК|草稿|SZKIC|BOZZA|BORRADOR|CONCEPT|BROUILLON|ENTWURF
Certified copy|Копия верна|核证副本|Za zgodność z oryginałem|Copia conforme|Copia certificada|Gewaarmerkte kopie|Copie certifiée conforme|Beglaubigte Kopie
CERTIFIED COPY|КОПИЯ ВЕРНА|核证副本|ZA ZGODNOŚĆ|COPIA CONFORME|COPIA CERTIFICADA|GEWAARMERKTE KOPIE|COPIE CERTIFIÉE|BEGLAUBIGTE KOPIE
YOUR TEXT|ВАШ ТЕКСТ|您的文字|TWÓJ TEKST|IL TUO TESTO|TU TEXTO|UW TEKST|VOTRE TEXTE|IHR TEXT
Date __________|Дата __________|日期 __________|Data __________|Data __________|Fecha __________|Datum __________|Date __________|Datum __________
Edit|Редактировать|编辑|Edytuj|Modifica|Editar|Bewerken|Modifier|Bearbeiten
Delete|Удалить|删除|Usuń|Elimina|Eliminar|Verwijderen|Supprimer|Löschen
Backup|Резервная копия|备份|Kopia zapasowa|Copia di sicurezza|Copia de seguridad|Reservekopie|Sauvegarde|Sicherung
Search stamps|Поиск штампов|搜索印章|Szukaj pieczątek|Cerca timbri|Buscar sellos|Stempels zoeken|Rechercher des tampons|Stempel suchen
Delete this stamp?|Удалить этот штамп?|删除此印章？|Usunąć tę pieczątkę?|Eliminare questo timbro?|¿Eliminar este sello?|Deze stempel verwijderen?|Supprimer ce tampon ?|Diesen Stempel löschen?
No results|Ничего не найдено|未找到结果|Brak wyników|Nessun risultato|Sin resultados|Geen resultaten|Aucun résultat|Keine Ergebnisse
Save|Сохранить|保存|Zapisz|Salva|Guardar|Opslaan|Enregistrer|Speichern
Cancel|Отмена|取消|Anuluj|Annulla|Cancelar|Annuleren|Annuler|Abbrechen
Close|Закрыть|关闭|Zamknij|Chiudi|Cerrar|Sluiten|Fermer|Schließen
Next|Далее|下一步|Dalej|Avanti|Siguiente|Volgende|Suivant|Weiter
Pause|Пауза|暂停|Pauza|Pausa|Pausa|Pauze|Pause|Pause
Play|Воспроизвести|播放|Odtwórz|Riproduci|Reproducir|Afspelen|Lire|Abspielen
Tools|Инструменты|工具|Narzędzia|Strumenti|Herramientas|Gereedschap|Outils|Werkzeuge
Properties and data|Свойства и данные|属性和数据|Właściwości i dane|Proprietà e dati|Propiedades y datos|Eigenschappen en gegevens|Propriétés et données|Eigenschaften und Daten
Editor panels|Панели редактора|编辑器面板|Panele edytora|Pannelli editor|Paneles del editor|Editorpanelen|Panneaux de l’éditeur|Editorbereiche
Close panel|Закрыть панель|关闭面板|Zamknij panel|Chiudi pannello|Cerrar panel|Paneel sluiten|Fermer le panneau|Bereich schließen
Excel template|Шаблон Excel|Excel 模板|Szablon Excel|Modello Excel|Plantilla Excel|Excel-sjabloon|Modèle Excel|Excel-Vorlage
Export Excel|Экспорт Excel|导出 Excel|Eksport Excel|Esporta Excel|Exportar Excel|Excel exporteren|Exporter Excel|Excel exportieren
Field|Поле|字段|Pole|Campo|Campo|Veld|Champ|Feld
Label|Название|名称|Etykieta|Etichetta|Etiqueta|Label|Libellé|Bezeichnung
Type|Тип|类型|Typ|Tipo|Tipo|Type|Type|Typ
Required|Обязательное|必填|Wymagane|Obbligatorio|Obligatorio|Verplicht|Obligatoire|Erforderlich
Instructions|Инструкция|说明|Instrukcja|Istruzioni|Instrucciones|Instructies|Instructions|Anleitung
Data set|Набор данных|数据集|Zestaw danych|Set di dati|Conjunto de datos|Gegevensset|Jeu de données|Datensatz
Drop the file here|Отпустите файл здесь|将文件放在此处|Upuść plik tutaj|Rilascia il file qui|Suelta el archivo aquí|Laat het bestand hier los|Déposez le fichier ici|Datei hier ablegen
Drop an Excel (.xlsx) or JSON file here|Перетащите сюда Excel (.xlsx) или JSON|将 Excel (.xlsx) 或 JSON 文件拖到此处|Przeciągnij plik Excel (.xlsx) lub JSON|Trascina un file Excel (.xlsx) o JSON|Arrastra un archivo Excel (.xlsx) o JSON|Sleep een Excel- (.xlsx) of JSON-bestand hierheen|Glissez un fichier Excel (.xlsx) ou JSON ici|Excel- (.xlsx) oder JSON-Datei hierher ziehen
Choose a data schema first|Сначала выберите схему данных|请先选择数据结构|Najpierw wybierz schemat danych|Seleziona prima uno schema dati|Elige primero un esquema de datos|Kies eerst een gegevensschema|Choisissez d’abord un schéma de données|Wählen Sie zuerst ein Datenschema
Learning center|Обучение|学习中心|Centrum nauki|Centro di apprendimento|Centro de aprendizaje|Leercentrum|Centre d’apprentissage|Lernzentrum
Learn step by step|Пошаговое обучение|分步学习|Nauka krok po kroku|Impara passo dopo passo|Aprende paso a paso|Stap voor stap leren|Apprendre pas à pas|Schritt für Schritt lernen
Lessons|Уроки|课程|Lekcje|Lezioni|Lecciones|Lessen|Leçons|Lektionen
Animated demonstration|Пошаговая демонстрация|动画演示|Animowana demonstracja|Dimostrazione animata|Demostración animada|Geanimeerde demonstratie|Démonstration animée|Animierte Vorführung
Try it now|Попробовать|立即尝试|Wypróbuj teraz|Prova ora|Pruébalo ahora|Nu proberen|Essayer maintenant|Jetzt ausprobieren
Create your first document|Создание первого документа|创建您的第一个文档|Utwórz pierwszy dokument|Crea il primo documento|Crea tu primer documento|Maak uw eerste document|Créez votre premier document|Erstellen Sie Ihr erstes Dokument
Create your first stamp|Создание первого штампа|创建您的第一个印章|Utwórz pierwszą pieczątkę|Crea il primo timbro|Crea tu primer sello|Maak uw eerste stempel|Créez votre premier tampon|Erstellen Sie Ihren ersten Stempel
Prepare Excel data|Подготовка данных в Excel|准备 Excel 数据|Przygotuj dane Excel|Prepara i dati Excel|Prepara datos en Excel|Excel-gegevens voorbereiden|Préparer les données Excel|Excel-Daten vorbereiten
Choose a layout|Выберите макет|选择模板|Wybierz szablon|Scegli un modello|Elige un diseño|Kies een ontwerp|Choisissez un modèle|Vorlage auswählen
Add and move objects|Добавьте и переместите объекты|添加和移动对象|Dodawaj i przesuwaj obiekty|Aggiungi e sposta oggetti|Añade y mueve objetos|Objecten toevoegen en verplaatsen|Ajouter et déplacer des objets|Objekte hinzufügen und verschieben
Edit the content|Измените содержимое|编辑内容|Edytuj zawartość|Modifica il contenuto|Edita el contenido|Inhoud bewerken|Modifier le contenu|Inhalt bearbeiten
Personalize if needed|Добавьте данные при необходимости|按需个性化|Personalizuj w razie potrzeby|Personalizza se necessario|Personaliza si lo necesitas|Personaliseer indien nodig|Personnaliser si nécessaire|Bei Bedarf personalisieren
Save and export|Сохраните и экспортируйте|保存并导出|Zapisz i eksportuj|Salva ed esporta|Guarda y exporta|Opslaan en exporteren|Enregistrer et exporter|Speichern und exportieren
Open the stamp studio|Откройте студию штампов|打开印章工作室|Otwórz studio pieczątek|Apri lo studio timbri|Abre el estudio de sellos|Open de stempelstudio|Ouvrir l’atelier de tampons|Stempelstudio öffnen
Choose a base|Выберите основу|选择基础样式|Wybierz podstawę|Scegli una base|Elige una base|Kies een basis|Choisir une base|Grundlage auswählen
Change the text|Измените текст|更改文字|Zmień tekst|Modifica il testo|Cambia el texto|Tekst wijzigen|Modifier le texte|Text ändern
Arrange the composition|Настройте композицию|调整布局|Ułóż kompozycję|Organizza la composizione|Organiza la composición|Compositie indelen|Organiser la composition|Komposition anordnen
Save and download|Сохраните и скачайте|保存并下载|Zapisz i pobierz|Salva e scarica|Guarda y descarga|Opslaan en downloaden|Enregistrer et télécharger|Speichern und herunterladen
Choose a data schema|Выберите схему данных|选择数据结构|Wybierz schemat danych|Scegli uno schema dati|Elige un esquema de datos|Kies een gegevensschema|Choisir un schéma de données|Datenschema auswählen
Download the Excel template|Скачайте шаблон Excel|下载 Excel 模板|Pobierz szablon Excel|Scarica il modello Excel|Descarga la plantilla Excel|Download het Excel-sjabloon|Télécharger le modèle Excel|Excel-Vorlage herunterladen
Fill in the rows|Заполните строки|填写各行|Wypełnij wiersze|Compila le righe|Rellena las filas|Vul de rijen in|Remplir les lignes|Zeilen ausfüllen
Review the import|Проверьте импорт|检查导入结果|Sprawdź import|Controlla l’importazione|Revisa la importación|Import controleren|Vérifier l’importation|Import prüfen
Generate documents|Сгенерировать документы|生成文档|Generuj dokumenty|Genera documenti|Generar documentos|Documenten genereren|Générer des documents|Dokumente erzeugen
Electronic signature|Электронная подпись|电子签名|Podpis elektroniczny|Firma elettronica|Firma electrónica|Elektronische handtekening|Signature électronique|Elektronische Signatur
Jurisdiction|Юрисдикция|司法管辖区|Jurysdykcja|Giurisdizione|Jurisdicción|Rechtsgebied|Juridiction|Rechtsraum
Russia|Россия|俄罗斯|Rosja|Russia|Rusia|Rusland|Russie|Russland
European Union|Европейский союз|欧盟|Unia Europejska|Unione europea|Unión Europea|Europese Unie|Union européenne|Europäische Union
China|Китай|中国|Chiny|Cina|China|China|Chine|China
Other country|Другая страна|其他国家|Inny kraj|Altro paese|Otro país|Ander land|Autre pays|Anderes Land
Document to sign|Документ для подписания|待签署文档|Dokument do podpisania|Documento da firmare|Documento para firmar|Te ondertekenen document|Document à signer|Zu signierendes Dokument
CryptoPro certificate|Сертификат КриптоПро|CryptoPro 证书|Certyfikat CryptoPro|Certificato CryptoPro|Certificado CryptoPro|CryptoPro-certificaat|Certificat CryptoPro|CryptoPro-Zertifikat
Connect certificate|Подключить сертификат|连接证书|Połącz certyfikat|Collega certificato|Conectar certificado|Certificaat verbinden|Connecter le certificat|Zertifikat verbinden
Sign document|Подписать документ|签署文档|Podpisz dokument|Firma documento|Firmar documento|Document ondertekenen|Signer le document|Dokument signieren
Signing…|Подписание…|正在签署…|Podpisywanie…|Firma in corso…|Firmando…|Ondertekenen…|Signature en cours…|Signieren…
Trusted signing provider required|Требуется доверенный сервис подписи|需要受信任的签名服务|Wymagany zaufany dostawca podpisu|Serve un fornitore di firma affidabile|Se requiere un proveedor de firma de confianza|Vertrouwde ondertekeningsdienst vereist|Prestataire de signature de confiance requis|Vertrauenswürdiger Signaturdienst erforderlich
`;
const languages = ['en', 'ru', 'zh', 'pl', 'it', 'es', 'nl', 'fr', 'de'];
export const MESSAGE_CATALOGS: Record<string, Record<string, string>> = Object.fromEntries(
  languages.map((id) => [id, {}]),
);
for (const row of (
  rows +
  EDITOR_MESSAGES +
  EDITOR_MORE +
  EDITOR_FINAL +
  HELP_MESSAGES +
  REMAINING_MESSAGES +
  EXTRA_MESSAGES +
  TUTORIAL_MESSAGES
)
  .trim()
  .split('\n')
  .filter((value) => value.trim())) {
  const values = row.split('|').map((value) => value.replaceAll('\\n', '\n'));
  if (values.length !== languages.length) throw new Error(`Invalid translation row: ${values[0]}`);
  languages.forEach((id, index) => {
    MESSAGE_CATALOGS[id][values[0]] ??= values[index];
    MESSAGE_CATALOGS[id][values[1]] = values[index];
  });
}
