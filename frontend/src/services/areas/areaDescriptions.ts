// Short descriptions of the 73 barris of Barcelona for the area card (TODO-064). Written by hand, no third-party
// text. Only stable facts: where the barri is, what it is known for. To be read through by someone who knows the
// city before launch.
//
// Keyed by the barri code of the data ('01'…'73', the last two digits of `barri-0101`), then by language code, so
// that a language can be added later (TODO-028) without touching the code that reads them.

export type DescriptionLang = 'en'
export const DEFAULT_DESCRIPTION_LANG: DescriptionLang = 'en'

export const AREA_DESCRIPTIONS: Readonly<Record<string, Readonly<Partial<Record<DescriptionLang, string>>>>> = {
  '01': { en: "Dense, multicultural old-town barri west of La Rambla. It has the MACBA museum and the Rambla del Raval, and is busy day and night." },
  '02': { en: "The medieval core of the city around the cathedral and Plaça Sant Jaume, with narrow lanes and Roman remains. Very central, and full of visitors." },
  '03': { en: "Former fishermen's quarter on a spit of land between the old port and the beach, with a tight grid of small flats. The sea and seafood restaurants are on the doorstep." },
  '04': { en: "Old-town barri around the Santa Maria del Mar church, the Picasso Museum and the Santa Caterina market. Medieval streets, small shops and many bars." },
  '05': { en: "Mostly residential barri in the east of the central Eixample, with a local square and market at its centre. Calmer than the streets around the Sagrada Família." },
  '06': { en: "The barri around Gaudí's basilica, on the Eixample grid. Crowded with visitors near the church and quiet and residential a few blocks away." },
  '07': { en: "The right side of the Eixample, with Modernista landmarks such as Casa Batlló and La Pedrera, upmarket shops and offices. Central, elegant and expensive." },
  '08': { en: "Central Eixample west of Carrer de Balmes, with the historic University building and the Hospital Clínic. Known for its restaurants and everyday shops." },
  '09': { en: "Mostly residential part of the western Eixample, with wide grid streets, schools and local shops. Calmer than the centre and close to Sants station." },
  '10': { en: "Eixample barri around the Sant Antoni market, reopened in 2018 after a long renovation, with a Sunday book and collectables market. Popular with young residents, with many bars." },
  '11': { en: "Barri on the slope of Montjuïc, with the Paral·lel theatres and Carrer de Blai, known for its pintxo bars. The parks and museums of Montjuïc are close." },
  '12': { en: "Mostly industrial barri between Montjuïc and the Zona Franca, with few homes. A place for logistics and trade rather than for daily life." },
  '13': { en: "Large barri on the south-west edge of the city between Montjuïc and the port, with housing blocks and industrial land. Mixed, and still changing." },
  '14': { en: "Small, quiet residential barri at the foot of Montjuïc, close to Plaça d'Espanya. Steep streets and little through traffic." },
  '15': { en: "Traditional residential barri between Plaça d'Espanya and Sants, with its own market and squares such as Plaça d'Osca. A strong neighbourhood feel." },
  '16': { en: "Residential barri on the south side of Sants, near Gran Via and Montjuïc, with low-rise blocks and traditional shops." },
  '17': { en: "Mostly residential barri in the west of the Sants district, around Carrer de Badal, with local shops and schools. Quieter than central Sants." },
  '18': { en: "Former village around Plaça de Sants, now the centre of its district and home of Barcelona Sants, the city's main railway station. Strong community life and a big August festival." },
  '19': { en: "Barri of the Camp Nou, the stadium of FC Barcelona, and of many offices along the Diagonal. Wide streets and a calmer, family feel away from the avenue." },
  '20': { en: "Residential barri in the south of Les Corts, built up around the old Maternitat hospital. Calm streets, schools and local shops." },
  '21': { en: "Leafy, upmarket barri in the north-west, with villas, the Pedralbes Monastery, the Royal Palace gardens and the university campuses on the Diagonal." },
  '22': { en: "Hill barri in the Collserola range, with detached houses, forest and the Tibidabo amusement park. Reached by the Vallvidrera funicular and FGC trains, and car-oriented." },
  '23': { en: "Former village that is now a calm upper-city barri, with a real village centre, markets and Plaça de Sarrià. Popular with families." },
  '24': { en: "Quiet, upmarket residential barri between Sarrià and Sant Gervasi, with villas and tree-lined streets." },
  '25': { en: "Affluent residential barri at the foot of Collserola, with villas, private schools and quiet streets." },
  '26': { en: "Upmarket, central barri known for Carrer de Santaló and the Galvany market, with good shops and restaurants close to the Diagonal." },
  '27': { en: "Hilly residential barri between Sant Gervasi and Vallcarca, with steep streets, the Turó del Putxet park and views over the city." },
  '28': { en: "Hillside barri between Gràcia and Collserola, close to Park Güell, with steep streets and a mix of old houses, new blocks and community projects." },
  '29': { en: "Quiet hillside barri on the slopes below Collserola, with steep streets, small squares and a village feel." },
  '30': { en: "Small, quiet hillside barri in the Gràcia district, home to Park Güell, with steep streets and a village feel." },
  '31': { en: "Formerly an independent town, now Barcelona's bohemian heart, with small squares such as Plaça del Sol, independent shops, bars and the famous street decorations of its August festival." },
  '32': { en: "Dense residential barri on the eastern edge of Gràcia, close to the Sagrada Família, with small shops and many bars. Quieter than the centre of Gràcia." },
  '33': { en: "Residential barri on the lower slope of the Guinardó hills, close to the Sant Pau hospital site, with a mix of flats, small shops and green corners." },
  '34': { en: "Small hillside barri with steep streets and low-rise housing, mostly residential." },
  '35': { en: "Large residential barri on the hills of the Horta-Guinardó district, with the Parc del Guinardó and steep streets that make for many stairs and ramps." },
  '36': { en: "Small, quiet residential barri on a hillside, with steep streets and low-rise housing." },
  '37': { en: "Hillside barri known for its steep streets and for the Bunkers del Carmel, a viewpoint with a 360° view over the city." },
  '38': { en: "Residential hillside barri in the north of the city, with steep streets and views, on the slopes below Collserola." },
  '39': { en: "Small barri at the edge of Collserola, with low-rise housing and quiet streets, far from the city centre." },
  '40': { en: "Planned residential estate from the 1960s: housing blocks set in green space, next to Collserola and the Vall d'Hebron hospital." },
  '41': { en: "Home of the Vall d'Hebron hospital campus and of sports facilities built for the 1992 Olympics, at the foot of Collserola." },
  '42': { en: "Small, quiet barri between Horta and the Vall d'Hebron hospital, with low-rise housing and a village feel." },
  '43': { en: "Former village on the hills with a real village centre and the Laberint d'Horta, the oldest preserved garden in the city." },
  '44': { en: "Mostly residential barri in the south of Nou Barris, close to Sant Andreu and Horta, with everyday shops and a mix of older and newer blocks." },
  '45': { en: "Residential barri of mid-rise blocks in the south of Nou Barris, with local shops and schools." },
  '46': { en: "Hillside residential barri in Nou Barris, with housing blocks from the 1950s and 60s and a strong local community." },
  '47': { en: "Small hillside residential barri in Nou Barris, built in the 1950s as workers' housing." },
  '48': { en: "Residential barri in Nou Barris with blocks from the 1960s and the Parc de la Guineueta." },
  '49': { en: "Hillside residential barri in Nou Barris, on the slope of Collserola, quiet and far from the centre." },
  '50': { en: "Hillside residential barri in Nou Barris, with steep streets and a strong neighbourhood identity." },
  '51': { en: "Hillside residential barri in Nou Barris, with housing blocks from the 1950s and 60s." },
  '52': { en: "Dense residential barri of mid-rise blocks in Nou Barris, built in the 1950s and 60s, with everyday shops and a local market." },
  '53': { en: "Residential barri in the north of Nou Barris, next to the ring road, with housing estates from the 1950s and 60s." },
  '54': { en: "Hilltop barri at the northern edge of the city, in the foothills of Collserola, with steep streets and views over the Besòs valley." },
  '55': { en: "Isolated residential barri at the northern edge of the city, at the foot of Collserola, with dense housing blocks and its own character." },
  '56': { en: "Small, quiet barri at the north-eastern end of the city, by the Besòs river, with low-rise housing." },
  '57': { en: "Residential barri at the northern edge of the city, by the Besòs river and the Trinitat road junction." },
  '58': { en: "Small, quiet barri between the Besòs river and the railway lines, with low-rise social housing." },
  '59': { en: "Residential barri beside the Besòs river, first built with low houses for workers in the 1920s and 30s and now being renewed." },
  '60': { en: "Former independent town with a village centre around Plaça d'Orfila and Plaça Mercadal, the Fabra i Coats arts centre and a strong local identity." },
  '61': { en: "Barri around the Sagrera railway station, one of the city's large urban redevelopment areas, with housing and an industrial past." },
  '62': { en: "Quiet residential barri in Sant Andreu, named after the 1952 Eucharistic Congress and the houses built by returnees from the Americas." },
  '63': { en: "Mostly residential barri in the south of Sant Andreu, close to the Sagrera, with everyday shops and a lively street life." },
  '64': { en: "Dense residential barri east of the Sagrada Família, with everyday shops and a local market." },
  '65': { en: "Traditional barri with an industrial past, with the Parc del Clot built on former railway workshops and good train and metro links." },
  '66': { en: "Residential barri in Poblenou, with a mix of old low-rise housing and new buildings of the 22@ innovation district." },
  '67': { en: "Barri built for the 1992 Olympic Games, with the Olympic Port, the beach, two high towers and a flat grid of streets." },
  '68': { en: "Former industrial district that has become a creative and tech hub (22@), with the Rambla del Poblenou, the beaches and converted factories." },
  '69': { en: "Newer barri on the north-eastern seafront, around the Diagonal Mar park and shopping centre and the Mar Bella beaches." },
  '70': { en: "Working-class residential barri at the north-eastern end of the city, by the Besòs river and the Fòrum seafront." },
  '71': { en: "Mostly residential barri in Sant Martí, with mid-rise blocks, close to Poblenou." },
  '72': { en: "Former village that is now a dense residential barri, the historic core of the Sant Martí district." },
  '73': { en: "Large residential barri in the north of Sant Martí, built mainly in the 1960s and 70s, with wide avenues and a strong local community." },
}

/** The description of a barri in a language, falling back to English; null when there is none (a municipality). */
export function areaDescription(code: string, lang: string = DEFAULT_DESCRIPTION_LANG): string | null {
  const texts = AREA_DESCRIPTIONS[code]
  if (!texts) return null
  return (texts as Record<string, string | undefined>)[lang] ?? texts[DEFAULT_DESCRIPTION_LANG] ?? null
}
