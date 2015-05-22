accounting.settings = {
  number: {
    precision : 2,
    thousand: '.',
    decimal : ','
  }
};

var pauschalen = {
  ssp:  40,
  beam: 25,
  sosp: 30,
  kssp:  5,
  unth:  0,
  soz:   0
},
abzugEltg = 300.00,
kindergeld = function(i) {
  switch (i) {
    case 1:
    case 2:
      return 184;
    case 3:
      return 190;
    default:
      return 215;
  }
};

var numform = accounting.formatNumber.bind(accounting);

function showModal() {
  $('#info-modal').modal();
}
function betreuungszeitenAnzeigen() {
  $('.has-erro').removeClass('.has-error');
  $('.betreuungszeit .einKind').show();
  var kinderInBetreuung = +$('input[name="inBetreuung"]:checked').val(),
  kinderzahlInput = $('input[name="kinderzahl"]');
  if (!kinderzahlInput.val()) {
    kinderzahlInput.attr('placeholder', kinderInBetreuung);
  }
  switch (kinderInBetreuung) {
    case 3:
      $('.betreuungszeit .dreiKinder').show();
      $('.betreuungszeit .zweiKinder').show();
      break;
    case 2:
      $('.betreuungszeit .dreiKinder').hide();
      $('.betreuungszeit .zweiKinder').show();
      break;
    case 1:
      $('.betreuungszeit .dreiKinder').hide();
      $('.betreuungszeit .zweiKinder').hide();
      break;
  }
}

function einkommenHinzufügen(event, art, höhe) {
  var template = $('.einkommen-template').clone();
  template.removeClass('einkommen-template');
  if (art) {
    template.find('select.einkommensart').val(art);
  }
  if (höhe) {
    template.find('input[name="höhe"]').val(höhe);
  }
  $('.einkommensliste').append(template);
}

function removeEinkommen(e) {
  $(e.currentTarget).parents('.eintrag').remove();
}

function berechnen() {
  var Daten = Vorbereitung();
  if (!Daten) {
    return;
  }
  var ErgebnisNeu = Verarbeitung(Daten, Parameter.Neu),
  ErgebnisAlt = Verarbeitung(Daten, Parameter.Alt);
  LokalSpeichern(Daten);

  $('#resultNeu').html(ErgebnisNeu.text);
  $('#resultAlt').html(ErgebnisAlt.text);
  $('#gebühr').html(GebührText(ErgebnisNeu.gebühr, ErgebnisAlt.gebühr));
  $('.berechnungsTab').tab();
  $('.berechnung').show();
  $('.gebuehreninfo').show();
}

function Vorbereitung() {
  $('.has-error').removeClass('has-error');
  $('.has-warning').removeClass('has-warning');

  var alleZeiten = [],
  zeit = +$('input[name="inBetreuung"]:checked').val(),
  zeiten = $('input[name="zeit"]');
  if (isNaN(zeit)) {
    $('.zahlInBetreuung').addClass('has-error');
    return false;
  }
  for (i = 0; i < zeit; i++) {
    alleZeiten[i] = +zeiten.eq(i).val() || 9;
  }

  var kinderzahl = $('input[name="kinderzahl"]').val();
  kinderzahl = kinderzahl ? +kinderzahl : null;

  var alleEinkommen = [],
  einträge = $('.eintrag').not('.einkommen-template'),
  art, höhe;
  for (var i = 0; i < einträge.length; i++) {
    art = einträge.eq(i).find('select.einkommensart').val();
    if (!(art in pauschalen) && (art != 'eltg')) {
      einträge.eq(i).addClass('has-warning');
      continue;
    }
    höhe = einträge.eq(i).find('input[name="höhe"]').val().replace('.', '').replace(',', '.');
    if (+höhe <= 0) {
      einträge.eq(i).addClass('has-warning');
      continue;
    }
    alleEinkommen[i] = {
      Art: art,
      Höhe: +höhe
    };
  }

  return {
    Betreuungszeiten: alleZeiten,
    Kinderzahl: kinderzahl,
    Einkommen: alleEinkommen
  };
}

function Verarbeitung(Daten, Parameter) {
  var Kinderzahl = Daten.Kinderzahl ?
    +Daten.Kinderzahl :
    Daten.Betreuungszeiten.length,
  text = '',
  subtext = '',
  abzuege,
  bereinigtesEinkommen,
  Einkommen = 0,
  Gebühr,
  einzelGebühr,
  betreuungsDifferenz,
  gesamtGebühr = 0,
  hr = '        ---------------------------------------<br>';

  text += '<em>1) zu berücksichtigtigendes, bereinigtes Einkommen</em><br>';
  text += '        Angegeben      Pauschale      Bereinigt<br>';
  for (var i = 0, l = Daten.Einkommen.length; i < l; i++) {
    if (Daten.Einkommen[i].Art == 'eltg') {
      bereinigtesEinkommen = Math.max(0, Daten.Einkommen[i].Höhe - abzugEltg);
      subtext = '- ' + numform(abzugEltg) + ' €';
    } else {
      abzuege = 1 - pauschalen[Daten.Einkommen[i].Art] / 100;
      bereinigtesEinkommen = abzuege * Math.max(0, Daten.Einkommen[i].Höhe);
      subtext = '- ' + pauschalen[Daten.Einkommen[i].Art] + ' %';
    }
    Einkommen += bereinigtesEinkommen;
    text += sprintf(
      '        %9s €   %10s    %9s €<br>',
      numform(Daten.Einkommen[i].Höhe),
      subtext,
      numform(bereinigtesEinkommen)
    );
  }
  for (i = 0, l = Kinderzahl; i < l; i++) {
    bereinigtesEinkommen = kindergeld(i + 1);
    Einkommen += bereinigtesEinkommen;
    text += sprintf(
      '        %9s €        - 0 %%    %9s €<br>',
      numform(bereinigtesEinkommen),
      numform(bereinigtesEinkommen)
    );
  }
  text += hr;
  text += sprintf(
    '        <strong>Gesamt</strong>:                     %9s €<br>',
    numform(Einkommen));
  text += '<br>';

  text += '<em>2) anzurechnendes Einkommen</em><br>';
  if (Einkommen > Parameter.maximalEinkommen) {
    Einkommen = Parameter.maximalEinkommen;
    subtext = 'Max. Einkommen';
  } else {
    subtext = 'zu berücksichtigend';
  }
  text += sprintf(
      '        %-19s         %9s €<br>',
      subtext,
      numform(Einkommen));
  for (i = 0, l = Kinderzahl; i < l; i++) {
    Einkommen -= Parameter.Freibeträge(i + 1);
    text += sprintf(
      '        Freibetrag %2d. Kind        - %8s €<br>',
      i + 1,
      accounting.formatNumber(Parameter.Freibeträge(i + 1)));
  }
  text += hr;
  text += sprintf(
    '        <strong>Gesamt</strong>:                     %9s €<br>',
    numform(Einkommen));
  text += '<br>';

  if (Einkommen <= 0) {
    text += '        Kein anrechenbares Einkommen, es wird keine Gebühr erhoben<br>';
    return {
      text: text,
      gebühr: 0
    };
  }

  if (Parameter.minAnrechenbar && (Einkommen < Parameter.minAnrechenbar)) {
    text += '        Das anrechenbare Einkommen liegt nicht über<br>';
    text += sprintf(
      '        %s €, es wird keine Gebühr erhoben.<br>',
      numform(Parameter.minAnrechenbar));
    return {
      text: text,
      gebühr: 0
    };
  }

  text += '<em>3) Grundgebühr</em><br>';
  Gebühr = Parameter.Gebührensatz / 100 * Einkommen;
  text += sprintf(
    '         %2d %%                       %9s €<br>',
    Parameter.Gebührensatz,
    numform(Gebühr));
  text += '<br>';
  text += '<em>4) tatsächliche Gebühr</em><br>';
  text += '        BetrZeit    BerückAbweichung     Gebühr<br>';
  for (i = 0, l = Daten.Betreuungszeiten.length; i < l; i++) {
    betreuungsDifferenz = (Daten.Betreuungszeiten[i] / 9 - 1) * Parameter.BetreuungsDifferenzFaktor;
    einzelGebühr = Gebühr + betreuungsDifferenz * Gebühr;
    gesamtGebühr += einzelGebühr;
    text += sprintf(
      '        %4.1f h      %s %5s %%       %9s €<br>',
      Daten.Betreuungszeiten[i],
      (betreuungsDifferenz >= 0 ? ' ' : '-'),
      numform(Math.abs(betreuungsDifferenz * 100, {precision:1})),
      numform(einzelGebühr));
  }
  text += hr;
  text += sprintf(
    '        <strong>Gesamt</strong>:                     %9s €<br>',
    numform(gesamtGebühr));
  text += '<br>';

  if (gesamtGebühr < 10) {
    text += '        <em>KiTa-Gebühren unter 20,00 € werden nicht erhoben.</em><br>';
    gesamtGebühr = 0;
  } else {
    text += sprintf(
      '        erhobene Gebühr:               <strong>%3d</strong>.00 €<br>',
      Math.round(gesamtGebühr));
    text += '        <em>(kaufmännisch gerundet)</em><br>';
  }
  return {
    text: text,
    gebühr: Math.round(gesamtGebühr)
  };
}

function GebührText(gebührNeu, gebührAlt) {
  if (gebührNeu == gebührAlt) {
    return sprintf(
      'Die berechnete Gebühr bleibt bei <strong>%d<strong> €',
      gebührNeu);
  }
  return sprintf(
    'Die berechnete Gebühr beträgt <strong>%d</strong> €. <small>Das ist eine <em>%s</em> um <strong>%d</strong> €' +
    ' (%d %%) gegenüber der alten Gebühr von %d €</small>.',
    gebührNeu,
    gebührNeu > gebührAlt ? 'Erhöhung' : 'Verringerung',
    Math.abs(gebührNeu - gebührAlt),
    Math.round(Math.abs(gebührNeu - gebührAlt) / gebührAlt * 100),
    gebührAlt);
}

function LokalSpeichern(Daten) {
  if (!window.localStorage) {
    return;
  }
  window.localStorage.setItem('KitaGebRechner', JSON.stringify(Daten));
}

function LokalLaden() {
  if (!window.localStorage) {
    return;
  }
  var KitaGebRechner = window.localStorage.getItem('KitaGebRechner');
  try {
    KitaGebRechner = JSON.parse(KitaGebRechner);
  } catch (err) {
    if (err.name == 'SyntaxError') {
      LokalLoeschen();
    }
    return false;
  }
  if (!KitaGebRechner) {
    return false;
  }

  var zeiten = $('input[name="zeit"]');
  for (var i = 0, l = KitaGebRechner.Betreuungszeiten.length; i < l; i++) {
    if (KitaGebRechner.Betreuungszeiten[i] != 9) {
      zeiten.eq(i).val(KitaGebRechner.Betreuungszeiten[i]);
    }
  }
  $('input[name="inBetreuung"][value="' + l + '"]').click();

  $('input[name="kinderzahl"]').val(KitaGebRechner.Kinderzahl);

  var template = $('.einkommen-template');
  for (i = 0, l = KitaGebRechner.Einkommen.length; i < l; i++) {
    einkommenHinzufügen(null, KitaGebRechner.Einkommen[i].Art, KitaGebRechner.Einkommen[i].Höhe);
  }

  return true;
}

function LokalLoeschen(silent) {
  window.localStorage.removeItem('KitaGebRechner');
  if (!!silent) {
    window.alert('Daten gelöscht');
  }
}

function maillink() {
  var coded = 'rIwi1ri@NoJ3W1i7.R9',
  key = '4hI3QDaUx2HtqEWTm9GLJgKM61cv5dinkfYSOs8AzCZb0opBRNwrPjXFylu7eV',
  shift = coded.length,
  link = '';
  for (var i = 0, l = coded.length; i < l; i++) {
    if (key.indexOf(coded.charAt(i)) == -1) {
      ltr = coded.charAt(i);
      link += (ltr);
    } else {
      ltr = (key.indexOf(coded.charAt(i)) - shift + key.length) % key.length;
      link += (key.charAt(ltr));
    }
  }
  return link;
}

function main() {
  $('#info').click(showModal);
  $('input[name="inBetreuung"]')
    .change(betreuungszeitenAnzeigen);
  $('#einkommenHinzufügen').click(einkommenHinzufügen);
  $('.einkommensliste').on('click', 'button.removeEinkommen', removeEinkommen);
  $('#calc').click(berechnen);
  $('#datenLoeschen').click(LokalLoeschen);
  if (LokalLaden()) {
    berechnen();
  }
  $('#email').attr('href', 'mailto:' + maillink());
}

$(main);
