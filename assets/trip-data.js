/* Catalonia 2026. The content: who is going, what there is to do, where to eat,
   the running routes and every phone number.

   This is the file to edit when a restaurant changes its number, a route needs
   a new waypoint, or somewhere new is worth adding. The behaviour lives in
   you.js and does not need touching for any of that. */
(function () {
  /* ---------- who is who ---------- */

  var PEOPLE = {
    lilyandmax:      { label: 'Lily & Max',      names: ['Lily', 'Max'],      arrive: '2026-08-23', leave: '2026-08-30', legs: ['camp'] },
    camandben:       { label: 'Cam & Ben',       names: ['Cam', 'Ben'],       arrive: '2026-08-23', leave: '2026-08-30', legs: ['camp'] },
    daisyandphil:    { label: 'Daisy & Phil',    names: ['Daisy', 'Phil'],    arrive: '2026-08-20', leave: '2026-08-30', legs: ['pals', 'camp'] },
    estelleandchris: { label: 'Estelle & Chris', names: ['Estelle', 'Chris'], arrive: '2026-08-20', leave: '2026-09-02', legs: ['pals', 'camp', 'falset'] }
  };

  /* ---------- what there is to do ---------- */

  var INTERESTS = [
    { id: 'coves',  label: 'Coves & swimming' },
    { id: 'lunch',  label: 'Long lunches' },
    { id: 'run',    label: 'Running & walking' },
    { id: 'boat',   label: 'Boats & snorkelling' },
    { id: 'spa',    label: 'Spa & slow mornings' },
    { id: 'wine',   label: 'Wine' },
    { id: 'towns',  label: 'Old towns & markets' },
    { id: 'photo',  label: 'Photography' },
    { id: 'kids',   label: 'Kids first' },
    { id: 'late',   label: 'Late tables' }
  ];

  var PLACES = [
    { name: 'The Camí de Ronda', where: 'Calella de Palafrugell', leg: 'camp', tags: ['coves', 'run', 'photo'],
      why: 'The coastal path out of Port Bo. Swimmable coves the whole way and the best light before nine.',
      q: 'Camí de Ronda, Calella de Palafrugell', anchor: '#coast' },
    { name: 'Far de Sant Sebastià', where: 'Llafranc', leg: 'camp', tags: ['run', 'photo', 'late', 'lunch'],
      why: 'The headland climb. Terrace drinks at the top, and the turn point of run 01.',
      q: 'Far de Sant Sebastià, Llafranc', anchor: '#running' },
    { name: 'Jardins de Cap Roig', where: 'Calella de Palafrugell', leg: 'camp', tags: ['photo', 'towns'],
      why: 'Botanical terraces stepping down to the sea. The festival ends before we land, so it is just the gardens.',
      q: 'Jardins de Cap Roig, Calella de Palafrugell', anchor: '#coast' },
    { name: 'Begur town', where: 'Begur', leg: 'camp', tags: ['towns', 'photo', 'late'],
      why: 'Cuban-era mansions, and a castle worth climbing before a late table.',
      q: 'Begur, Girona', anchor: '#coast' },
    { name: 'Platja de Pals', where: 'Pals', leg: 'pals', tags: ['coves', 'kids', 'run'],
      why: 'Long flat sand, shallow for a long way out, and room for ten without a windbreak in sight.',
      q: 'Platja de Pals', anchor: '#pals' },
    { name: 'Pals old town', where: 'Pals', leg: 'pals', tags: ['towns', 'photo'],
      why: 'Stone streets and a tower, five minutes from La Pallissa. Go at dusk when the coaches have gone.',
      q: 'Pals old town, Girona', anchor: '#pals' },
    { name: 'Peratallada', where: 'Baix Empordà', leg: 'pals', tags: ['towns', 'photo', 'lunch'],
      why: 'A village carved out of the rock it stands on. Lunch in a courtyard, then wander.',
      q: 'Peratallada, Girona', anchor: '#pals' },
    { name: 'Girona old town', where: 'Girona', leg: 'pals', tags: ['towns', 'photo'],
      why: 'City walls, the cathedral steps and the coloured houses on the Onyar. A morning, not a day.',
      q: 'Girona old town', anchor: '#pals' },
    { name: 'Illes Medes, by boat', where: "L'Estartit", leg: 'any', tags: ['boat', 'kids', 'coves'],
      why: 'Glass-bottomed Nautilus boats over the marine reserve. Book the first calm morning, the night before.',
      q: "Illes Medes, L'Estartit", tel: '+34972751489', telLabel: '972 751 489', anchor: '#bookings' },
    { name: 'Estany de Banyoles', where: 'Banyoles', leg: 'pals', tags: ['kids', 'coves', 'run'],
      why: 'A freshwater lake with a flat path all the way round and rowing boats to hire. No salt, no jellyfish.',
      q: 'Estany de Banyoles', anchor: '#pals' },
    { name: 'Toc al Mar', where: 'Aiguablava', leg: 'any', tags: ['lunch', 'coves', 'kids'],
      why: 'Lunch at a table on the cove itself. Book several days ahead in August.',
      q: 'Toc al Mar, Aiguablava', tel: '+34972113232', telLabel: '972 11 32 32', anchor: '#bookings' },
    { name: 'Hotel Aigua Blava terrace', where: 'Begur', leg: 'any', tags: ['lunch', 'coves', 'photo'],
      why: 'The long terrace above the water. Ask for the sea-facing end.',
      q: 'Hotel Aigua Blava, Begur', anchor: '#beachdinners' },
    { name: 'El Far, Sant Sebastià', where: 'Llafranc', leg: 'any', tags: ['lunch', 'photo', 'wine', 'late'],
      why: 'Lunch at the lighthouse with the whole coast underneath you. Long Empordà wine list.',
      q: 'El Far de Sant Sebastià, Llafranc', anchor: '#beachdinners' },
    { name: 'Tragamar', where: 'Calella de Palafrugell', leg: 'any', tags: ['lunch', 'kids', 'late'],
      why: 'Beach-front rice and grilled fish, relaxed enough for children at either end of the table.',
      q: 'Tragamar, Calella de Palafrugell', anchor: '#beachdinners' },
    { name: 'Sa Punta', where: 'Platja de Pals', leg: 'pals', tags: ['lunch', 'wine'],
      why: 'The proper Pals lunch. Bookings are answered slowly, so phone rather than email.',
      q: 'Restaurant Sa Punta, Pals', tel: '+34972636410', telLabel: '972 636 410', anchor: '#bookings' },
    { name: 'La Bella Lola', where: 'Port Bo, Calella', leg: 'camp', tags: ['late', 'kids', 'coves'],
      why: 'Right on the vaults at Port Bo. Front-line tables go early, ask for 20:30.',
      q: 'La Bella Lola, Calella de Palafrugell', anchor: '#beachdinners' },
    { name: 'The Llafranc front row', where: 'Llafranc', leg: 'camp', tags: ['late', 'kids'],
      why: 'The promenade restaurants, whichever has a free table. Walk the bay first, decide after.',
      q: 'Passeig de Llafranc restaurants', anchor: '#beachdinners' },
    { name: 'Mas de Torrent, the spa day', where: 'Torrent', leg: 'any', tags: ['spa', 'photo'],
      why: 'A masia hotel with a pool you could lose an afternoon in. Spa by appointment, lunch after.',
      q: 'Mas de Torrent, Torrent, Girona', anchor: '#lily' },
    { name: 'A skippered boat from Llafranc', where: 'Llafranc', leg: 'camp', tags: ['boat', 'coves', 'photo'],
      why: 'Half a day along the coves with someone else driving. Gets you to inlets you cannot walk to.',
      q: 'Llafranc marina', anchor: '#lily' },
    { name: 'La Bisbal, the ceramics street', where: "La Bisbal d'Empordà", leg: 'any', tags: ['towns', 'photo'],
      why: 'A whole street of pottery workshops. Buy the plate, then work out how it flies home.',
      q: "La Bisbal d'Empordà", anchor: '#lily' },
    { name: 'Aiguablava from above', where: 'Begur', leg: 'any', tags: ['photo', 'coves'],
      why: 'The mirador over the bay. Ten minutes and one photograph, then back in the car.',
      q: 'Mirador Aiguablava, Begur', anchor: '#lily' },
    { name: 'Magma thermal pools', where: 'Santa Coloma de Farners', leg: 'any', tags: ['spa', 'kids'],
      why: 'The rainy-day card, and the one to play the moment the forecast turns. Slots sell out in August.',
      q: 'Magma, Santa Coloma de Farners', tel: '+34972843535', telLabel: '972 843 535', anchor: '#bookings' },
    { name: 'Casamar', where: 'Llafranc', leg: 'any', tags: ['late', 'wine', 'lunch'],
      why: 'The Michelin dining room above the bay, and roughly €200 for two. Book before we fly.',
      q: 'Casamar, Llafranc', tel: '+34972300104', telLabel: '972 300 104', anchor: '#datenights' },
    { name: 'Els Bigotís del Gat', where: 'Falset, Priorat', leg: 'falset', tags: ['wine', 'photo', 'towns'],
      why: "Estelle's dad's vineyard and the three days after the coast. Terraced vines and a pool.",
      q: 'Falset, Tarragona', anchor: '#falset' }
  ];

  /* ---------- date night options ---------- */
  /* Bands are rough August guides for two with wine, not quotations.
     Only Casamar's comes from a figure the page already carried. */

  var DATE_NIGHTS = [
    { name: 'Casamar', where: 'Llafranc · Michelin', lo: 180, hi: 220, taxi: 1,
      note: 'Book weeks ahead. Closed Monday and Tuesday. Free parking at the hotel.',
      q: 'Casamar, Llafranc', tel: '+34972300104', telLabel: '972 300 104' },
    { name: 'El Far, Sant Sebastià', where: 'Llafranc · the lighthouse', lo: 110, hi: 150, taxi: 1,
      note: 'Ask for a table by the rail. Arrive an hour before sunset.',
      q: 'El Far de Sant Sebastià, Llafranc' },
    { name: 'Clara, at Hotel Aiguaclara', where: 'Begur · under the pergola', lo: 100, hi: 140, taxi: 1,
      note: 'Castle at sunset, table for 21:00. Service can be scattered.',
      q: 'Hotel Aiguaclara, Begur', tel: '+34613045504', telLabel: '613 04 55 04' },
    { name: 'Pa i Raïm', where: 'Palafrugell · the garden table', lo: 85, hi: 120, taxi: 0,
      note: 'Five minutes from the campsite, which at ten to nine matters more than the menu.',
      q: 'Pa i Raïm, Palafrugell' },
    { name: 'Tragamar, after seven', where: 'Calella · on the beach', lo: 85, hi: 120, taxi: 0,
      note: 'Ask for the promenade side. Walk back along the front.',
      q: 'Tragamar, Calella de Palafrugell' },
    { name: 'The Llafranc front row', where: 'Llafranc · no plan', lo: 75, hi: 115, taxi: 1,
      note: 'Whichever front table is free. Book the ride home before dinner, not after it.',
      q: 'Passeig de Llafranc restaurants' },
    { name: 'La Bella Lola', where: 'Port Bo · on the vaults', lo: 65, hi: 95, taxi: 0,
      note: 'Front-line tables go early. Ask for 20:30.',
      q: 'La Bella Lola, Calella de Palafrugell' },
    { name: 'Sunset at the lighthouse', where: 'Llafranc · drinks and a late plate', lo: 45, hi: 75, taxi: 1,
      note: 'Nothing booked, that is the point. Terrace first, promenade after.',
      q: 'Far de Sant Sebastià, Llafranc' },
    { name: 'The campsite terrace', where: 'Calella · zero logistics', lo: 35, hi: 60, taxi: 0,
      note: 'No taxi, no sitter handover, and you are four minutes from the pitch.',
      q: 'Camping Calella de Palafrugell' }
  ];

  var TAXI_RETURN = 30; /* rough return fare, camp to Llafranc or Begur */

  /* ---------- running ---------- */

  var ROUTES = {
    hills: { n: '01', name: 'The lighthouse out-and-back', dist: '10.5 km', gain: '≈300 m', start: '06:45',
             session: 'Hill repeats on the lighthouse climb, 4 to 6 × 90 s' },
    tempo: { n: '02', name: 'The plain tempo loop', dist: '11.2 km', gain: '≈70 m', start: '07:15',
             session: '2 km float, 3 × 2 km at threshold off 90 s, 2 km float' },
    long:  { n: '03', name: 'The Gavarres long run', dist: '20.5 km', gain: '≈520 m', start: '06:30',
             session: 'Run the climb on effort, not pace. Bank the volume.' },
    easy:  { n: '01', name: 'The lighthouse path, turned early', dist: '5 to 8 km', gain: 'as far as you like', start: '07:00',
             session: 'Out to Port Bo or Llafranc and back. Swim at the turn.' }
  };

  /* ---------- the directory ---------- */

  var DIRECTORY = [
    { group: 'Where we sleep', rows: [
      { name: 'Camping Calella de Palafrugell', sub: 'Carrer de Fuerteventura, Calella · 23 to 30 August',
        tel: '+34972615116', telLabel: '972 615 116', q: 'Camping Calella de Palafrugell',
        link: 'https://www.campingcalelladepalafrugell.com/en/', linkLabel: 'Site ↗' },
      { name: 'La Pallissa, Pals', sub: 'The Pals nights, 20 to 23 August', leg: 'pals', q: 'La Pallissa, Pals',
        link: 'https://www.booking.com/hotel/es/la-pallissa-pals.html', linkLabel: 'Booking ↗' },
      { name: 'Falset, the vineyard', sub: 'Els Bigotís del Gat · 30 August to 2 September', leg: 'falset', q: 'Falset, Tarragona' }
    ] },
    { group: 'Tables worth a phone call', rows: [
      { name: 'Casamar', sub: 'Llafranc · book weeks ahead', tel: '+34972300104', telLabel: '972 300 104', q: 'Casamar, Llafranc',
        link: 'https://module.lafourchette.com/en_GB/module/76149-b057c', linkLabel: 'Book ↗' },
      { name: 'Toc al Mar', sub: 'Aiguablava · the long beach lunch', tel: '+34972113232', telLabel: '972 11 32 32', q: 'Toc al Mar, Aiguablava',
        link: 'https://tocalmar.myrestoo.net/en/reservar', linkLabel: 'Book ↗' },
      { name: 'Clara, at Hotel Aiguaclara', sub: 'Begur · table for 21:00', tel: '+34613045504', telLabel: '613 04 55 04', q: 'Hotel Aiguaclara, Begur' },
      { name: 'Sa Punta', sub: 'Platja de Pals · phone, do not email', leg: 'pals', tel: '+34972636410', telLabel: '972 636 410', q: 'Restaurant Sa Punta, Pals',
        link: 'https://widget.thefork.com/en/c88e5ffb-0e0b-4965-8e17-7ff91caf90ee', linkLabel: 'Book ↗' },
      { name: 'Pa i Raïm', sub: 'Palafrugell · a few days ahead', q: 'Pa i Raïm, Palafrugell' },
      { name: 'Tragamar', sub: 'Calella · ask for the promenade side', q: 'Tragamar, Calella de Palafrugell' },
      { name: 'El Far, Sant Sebastià', sub: 'Llafranc · the lighthouse terrace', q: 'El Far de Sant Sebastià, Llafranc' },
      { name: 'La Bella Lola', sub: 'Port Bo · ask for 20:30', q: 'La Bella Lola, Calella de Palafrugell' }
    ] },
    { group: 'Booked in advance', rows: [
      { name: 'Magma thermal pools', sub: 'Santa Coloma · the rainy-day card', tel: '+34972843535', telLabel: '972 843 535',
        q: 'Magma, Santa Coloma de Farners', link: 'https://www.magma-cat.com/en/buy-ticket-magma/', linkLabel: 'Tickets ↗' },
      { name: 'Nautilus boats', sub: "L'Estartit · book the night before", tel: '+34972751489', telLabel: '972 751 489',
        q: "Nautilus, L'Estartit", link: 'https://booking.nautilus.es/', linkLabel: 'Book ↗' }
    ] },
    { group: 'Taxis', rows: [
      { name: 'Taxi Claus', sub: 'Book the ride home before dinner', tel: '+34663731841', telLabel: '663 731 841' },
      { name: 'Masca Taxi', sub: 'Second number if the first does not answer', tel: '+34972301123', telLabel: '972 301 123' },
      { name: 'Masca Taxi, mobile', sub: 'Taxis around Llafranc at 11pm are scarce', tel: '+34659936772', telLabel: '659 936 772' }
    ] },
    { group: 'If something goes wrong', rows: [
      { name: 'Emergencies', sub: 'Police, fire, ambulance · English spoken', tel: '112', telLabel: '112' },
      { name: 'Salut Respon', sub: '24 h nurse and doctor line', tel: '061', telLabel: '061' },
      { name: 'CAP de Palafrugell', sub: "Carrer d'Àngel Guimerà 6 · urgències 24 h", tel: '+34972610607', telLabel: '972 610 607',
        q: 'CAP Palafrugell, Carrer d\'Àngel Guimerà 6' },
      { name: 'Farmàcia Pou Juanola', sub: 'C. Pirroig 23, Calella', tel: '+34972615859', telLabel: '972 615 859',
        q: 'Farmàcia Pou Juanola, Calella de Palafrugell' },
      { name: 'Farmàcia Mendieta', sub: 'C. Francesc de Blanes 44, Llafranc', tel: '+34972302770', telLabel: '972 302 770',
        q: 'Farmàcia Mendieta, Llafranc' }
    ] }
  ];

  window.CAT26 = {
    PEOPLE: PEOPLE,
    INTERESTS: INTERESTS,
    PLACES: PLACES,
    DATE_NIGHTS: DATE_NIGHTS,
    TAXI_RETURN: TAXI_RETURN,
    ROUTES: ROUTES,
    DIRECTORY: DIRECTORY
  };
})();
