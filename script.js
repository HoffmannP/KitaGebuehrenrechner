accounting.settings = {
  number: {
    precision : 2,
    thousand: '.',
    decimal : ','
  }
};

var numform = accounting.formatNumber.bind(accounting);

function betreuungszeitenAnzeigen() {
  $('.einKind').show();
  switch (+$('.kinderzahl input:radio:checked').val()) {
    case 3:
      $('.dreiKinder').show();
      $('.zweiKinder').show();
      break;
    case 2:
      $('.dreiKinder').hide();
      $('.zweiKinder').show();
      break;
    case 1:
      $('.dreiKinder').hide();
      $('.zweiKinder').hide();
      break;
  }
}

function einkommenHinzufügen(art, höhe) {
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
  var Daten = Vorbereitung(),
  ErgebnisNeu = Verarbeitung(Daten, Parameter.Neu),
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
  var alleEinkommen = [],
  einträge = $('.eintrag').not('.einkommen-template');
  for (var i = 0; i < einträge.length; i++) {
    alleEinkommen[i] = {
      Höhe: +einträge.eq(i).find('input[name="höhe"]').val().replace('.', '').replace(',', '.'),
      Art: +einträge.eq(i).find('select.einkommensart').val()
    };
  }

  var alleZeiten = [],
  zeit = +$('.kinderzahl input:radio:checked').val(),
  zeiten = $('input[name="zeit"]'),
  kinder = +$('.kinderzahl input:radio:checked').val();
  for (i = 0; i < kinder; i++) {
    alleZeiten[i] = +zeiten.eq(i).val() || 9;
  }
  return {
    Betreuungszeiten: alleZeiten,
    Einkommen: alleEinkommen
  };
}

function Verarbeitung(Daten, Parameter) {
  var text = '',
  subtext = '',
  bereinigtesEinkommen,
  Einkommen = 0,
  Gebühr,
  einzelGebühr,
  betreuungsDifferenz,
  gesamtGebühr = 0;

  text += '<em>1) zu berücksichtigtigendes, bereinigtes Einkommen</em><br>';
  text += '        Angegeben      Pauschale      Bereinigt<br>';
  for (var i = 0, l = Daten.Einkommen.length; i < l; i++) {
    bereinigtesEinkommen = (1 - (Daten.Einkommen[i].Art / 100)) * Daten.Einkommen[i].Höhe;
    Einkommen += bereinigtesEinkommen;
    text += sprintf(
      '        %9s €       - %2d %%    %9s €<br>',
      numform(Daten.Einkommen[i].Höhe),
      Daten.Einkommen[i].Art,
      numform(bereinigtesEinkommen)
    );
  }
  text += '        ---------------------------------------<br>';
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
  for (i = 0, l = Daten.Betreuungszeiten.length; i < l; i++) {
    Einkommen -= Parameter.Freibeträge[i];
    text += sprintf(
      '        Freibetrag %d. Kind         - %8s €<br>',
      i + 1,
      accounting.formatNumber(Parameter.Freibeträge[i]));
  }
  text += '        ---------------------------------------<br>';
  text += sprintf(
    '        <strong>Gesamt</strong>:                     %9s €<br>',
    numform(Einkommen));
  text += '<br>';

  if (Parameter.minAnrechenbar && (Einkommen < Parameter.minAnrechenbar)) {
    text += '        Das anrechenbare Einkommen liegt nicht<br>';
    text += sprintf(
      '        über dem Mindesteinkommen von %s €,<br>',
      numform(Parameter.minAnrechenbar));
    text += '        es wird keine Gebühr erhoben!<br>';
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
  text += '        ---------------------------------------<br>';
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
    ' (%d %%) gegenüber der alten Gebühr von %d €</small>',
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
  window.localStorage.setItem('Betreuungszeiten', JSON.stringify(Daten.Betreuungszeiten));
  window.localStorage.setItem('Einkommen', JSON.stringify(Daten.Einkommen));
}

function LokalLaden() {
  if (!window.localStorage) {
    return;
  }
  var Betreuungszeiten = window.localStorage.getItem('Betreuungszeiten'),
  Einkommen = window.localStorage.getItem('Einkommen');
  if (!Betreuungszeiten || !Einkommen) {
    return;
  }
  Betreuungszeiten = JSON.parse(Betreuungszeiten);
  Einkommen = JSON.parse(Einkommen);

  zeiten = $('input[name="zeit"]');
  for (var i = 0, l = Betreuungszeiten.length; i < l; i++) {
    zeiten.eq(i).val(Betreuungszeiten[i]);
  }
  $('input[name="kinderzahl"][value="' + l + '"]').click();

  template = $('.einkommen-template');
  for (i = 0, l = Einkommen.length; i < l; i++) {
    einkommenHinzufügen(Einkommen[i].Art, Einkommen[i].Höhe);
  }
}

function main() {
  $('.kinderzahl input:radio')
    .change(betreuungszeitenAnzeigen);
  LokalLaden();
  $('#einkommenHinzufügen').click(einkommenHinzufügen);
  $('.einkommensliste').on('click', 'button.removeEinkommen', removeEinkommen);
  $('#calc').click(berechnen);
}

$(main);
