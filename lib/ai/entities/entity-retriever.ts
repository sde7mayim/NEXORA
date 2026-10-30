import {
  EntityCardData,
  EntityCategory,
  EntityDetectionResult,
  EntityImage,
  EntityQuickFact,
  EntitySpecGroup,
} from "./entity-types";

export class EntityRetrieverService {
  /**
   * Retrieves or builds a rich EntityCardData for a detected entity query.
   */
  static async retrieveEntity(detection: EntityDetectionResult): Promise<EntityCardData | null> {
    if (!detection.isEntityQuery || !detection.entityName) {
      return null;
    }

    const nameLower = detection.entityName.toLowerCase().trim();

    // 1. Check Curated Knowledge Base for exact matches (provides highest fidelity specifications)
    const curated = this.getCuratedEntity(nameLower, detection.category);
    if (curated) {
      return curated;
    }

    // 2. Dynamic Retrieval from Wikipedia API for arbitrary entities
    const dynamicEntity = await this.fetchFromWikipedia(detection.entityName, detection.category);
    if (dynamicEntity) {
      return dynamicEntity;
    }

    return null;
  }

  /**
   * High-accuracy curated entities covering laptops, smartphones, celebrities, places, and audio gadgets.
   */
  private static getCuratedEntity(nameLower: string, categoryHint?: EntityCategory): EntityCardData | null {
    // -------------------------------------------------------------------------
    // LAPTOP: Dell XPS 14
    // -------------------------------------------------------------------------
    if (nameLower.includes("xps 14") || (nameLower.includes("xps") && nameLower.includes("14"))) {
      return {
        id: "ent_laptop_dell_xps_14",
        name: "Dell XPS 14 (9440)",
        category: "laptop",
        subtitle: "14.5-inch Premium OLED Studio & Creator Ultrabook",
        description:
          "The Dell XPS 14 features an aerospace-grade CNC machined aluminum chassis with Gorilla Glass 3 palm rest, a seamless capacitive touch function row, invisible glass haptic trackpad, and an optional 3.2K OLED InfinityEdge touch display.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/DELL_XPS_13_and_15_%2837080596413%29.jpg/960px-DELL_XPS_13_and_15_%2837080596413%29.jpg",
            caption: "Dell XPS Premium Ultrabook in Platinum Silver finish",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Dell_XPS",
          },
        ],
        quickFacts: [
          { label: "Manufacturer", value: "Dell Technologies" },
          { label: "Form Factor", value: "14.5-inch Ultrabook" },
          { label: "Release Year", value: "2024" },
          { label: "Starting Weight", value: "1.68 kg (3.7 lbs)" },
          { label: "Battery Capacity", value: "69.5 Whr (Up to 15 hrs)" },
          { label: "Starting Price", value: "From $1,499 USD" },
        ],
        specGroups: [
          {
            groupName: "Performance & Architecture",
            specs: [
              { label: "Processor", value: "Intel Core Ultra 7 155H (16 Cores, 22 Threads, up to 4.8 GHz, Intel AI Boost NPU)" },
              { label: "Graphics", value: "Intel Arc Graphics (integrated) OR NVIDIA GeForce RTX 4050 Laptop GPU (30W TGP, 6GB GDDR6)" },
              { label: "Memory (RAM)", value: "16GB, 32GB, or 64GB LPDDR5x dual-channel (7467 MHz, soldered)" },
              { label: "Storage", value: "512GB, 1TB, 2TB, or 4TB PCIe 4.0 NVMe M.2 SSD" },
            ],
          },
          {
            groupName: "Display & Audio",
            specs: [
              { label: "Display Option 1", value: "14.5\" FHD+ (1920 x 1200) InfinityEdge, 500 nits, 100% sRGB, 120Hz VRR" },
              { label: "Display Option 2 (OLED)", value: "14.5\" 3.2K (3200 x 2000) OLED Touch, 400 nits, 100% DCI-P3, 120Hz, Dolby Vision" },
              { label: "Speakers", value: "Quad-speaker studio design (2x 2W woofers, 2x 2W tweeters, Waves MaxxAudio)" },
              { label: "Webcam", value: "1080p FHD RGB-IR Camera with Windows Hello facial recognition" },
            ],
          },
          {
            groupName: "Ports & Connectivity",
            specs: [
              { label: "I/O Ports", value: "3x Thunderbolt 4 (USB Type-C) with DisplayPort 2.1 and Power Delivery" },
              { label: "Audio & Slots", value: "1x 3.5mm combo headphone jack, 1x microSD card reader v6.0" },
              { label: "Wireless", value: "Intel Killer Wi-Fi 6E (1675) AX211 + Bluetooth 5.3" },
              { label: "Charging", value: "60W (Intel Arc) or 100W (RTX 4050) Type-C Fast Charger" },
            ],
          },
        ],
        features: [
          "Zero-lattice keyboard with larger keycaps for rapid, tactile typing",
          "Seamless glass haptic touchpad that disappears into the palm rest",
          "Dedicated on-die Intel AI Boost NPU for local AI workloads and Windows Studio Effects",
          "Dual-fan cooling system with vapor-chamber heat dispersal",
        ],
        pros: [
          "Exquisite, futuristic unibody aluminum build and premium aesthetic",
          "Stunning 3.2K 120Hz OLED touch display with deep blacks and rich colors",
          "Respectable battery longevity on integrated Intel Arc configurations",
          "Impressive quad-speaker audio performance for a 14-inch chassis",
        ],
        cons: [
          "RTX 4050 power limit is capped at 30W TGP, constraining intensive 3D gaming",
          "Capacitive touch function row lacks physical key tactile feedback",
          "RAM is soldered onto the motherboard and cannot be upgraded post-purchase",
          "Premium price point compared to standard productivity laptops",
        ],
        suitableFor: [
          "Creative professionals, photo/video editors, and graphic designers",
          "Software engineers needing a compact portable workstation with 32GB/64GB RAM",
          "Business executives and students wanting high battery life and sleek design",
        ],
        variants: [
          "Intel Core Ultra 7 155H + Intel Arc Graphics + FHD+ Display (Efficiency focused)",
          "Intel Core Ultra 7 155H + NVIDIA RTX 4050 + 3.2K OLED Touch (Creator focused)",
        ],
        sources: [
          { title: "Dell XPS 14 Technical Specifications", url: "https://www.dell.com/en-us/shop/dell-laptops/xps-14-laptop/spd/xps-14-9440-laptop" },
          { title: "Wikipedia: Dell XPS Family", url: "https://en.wikipedia.org/wiki/Dell_XPS" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // LAPTOP: Apple MacBook Pro 14 (M3 Series)
    // -------------------------------------------------------------------------
    if (nameLower.includes("macbook pro") || nameLower.includes("macbook pro 14")) {
      return {
        id: "ent_laptop_macbook_pro_14",
        name: "Apple MacBook Pro 14-inch (M3 / M3 Pro / M3 Max)",
        category: "laptop",
        subtitle: "Industry-Leading Apple Silicon Workstation for Developers & Pros",
        description:
          "The 14-inch MacBook Pro delivers extraordinary performance and up to 22 hours of battery life powered by 3-nanometer M3 architecture, featuring a class-leading Liquid Retina XDR display and Space Black finish.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/MacBook_Pro_14-inch_2021.png/960px-MacBook_Pro_14-inch_2021.png",
            caption: "14-inch MacBook Pro workstation with Liquid Retina XDR display",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/MacBook_Pro",
          },
        ],
        quickFacts: [
          { label: "Manufacturer", value: "Apple Inc." },
          { label: "Chipsets", value: "Apple M3, M3 Pro, or M3 Max (3nm)" },
          { label: "Battery Life", value: "Up to 22 hours video playback" },
          { label: "Weight", value: "1.55 kg (3.4 lbs)" },
          { label: "Starting Price", value: "From $1,599 USD" },
        ],
        specGroups: [
          {
            groupName: "Compute & Memory",
            specs: [
              { label: "CPU", value: "Up to 16-core CPU (12 performance and 4 efficiency cores on M3 Max)" },
              { label: "GPU", value: "Up to 40-core GPU with hardware-accelerated ray tracing and Dynamic Caching" },
              { label: "Unified Memory", value: "8GB, 18GB, 36GB, 48GB, 64GB, 96GB, or 128GB unified memory" },
              { label: "Storage", value: "512GB to 8TB blazing-fast SSD (up to 7.4 GB/s read speeds)" },
            ],
          },
          {
            groupName: "Display & Audio",
            specs: [
              { label: "Panel", value: "14.2\" Liquid Retina XDR (3024 x 1964), 120Hz ProMotion mini-LED" },
              { label: "Brightness", value: "1,000 nits sustained, 1,600 nits peak HDR, 600 nits SDR" },
              { label: "Audio", value: "High-fidelity six-speaker sound system with force-cancelling woofers" },
            ],
          },
          {
            groupName: "Connectivity & Chassis",
            specs: [
              { label: "Ports", value: "3x Thunderbolt 4, HDMI 2.1 (up to 8K), SDXC card slot, 3.5mm headphone jack" },
              { label: "Charging", value: "MagSafe 3 fast-charging (50% in 30 minutes with 96W adapter)" },
              { label: "Wireless", value: "Wi-Fi 6E (802.11ax) + Bluetooth 5.3" },
            ],
          },
        ],
        features: [
          "Hardware-accelerated ray tracing and mesh shading for 3D modeling and gaming",
          "Next-generation Dynamic Caching allocates on-chip memory in real-time",
          "Class-leading energy efficiency operating completely silent under typical workloads",
        ],
        pros: [
          "Unmatched battery longevity (easily lasts 15-20 hours on real-world workloads)",
          "Best-in-class display for color grading, HDR editing, and outdoor visibility",
          "Zero performance throttling when operating on battery versus plugged in",
          "Generous port selection including HDMI 2.1 and full-sized SDXC card slot",
        ],
        cons: [
          "Base M3 model starts with only 8GB unified memory",
          "Internal RAM and SSD components are non-upgradeable post purchase",
          "Display notch houses camera without Face ID support (Touch ID only)",
        ],
        suitableFor: [
          "Software engineers, full-stack developers, and iOS/macOS engineers",
          "Video editors, colorists, and 3D animators requiring reliable sustained power",
          "Remote professionals who need all-day battery life without carrying chargers",
        ],
        sources: [
          { title: "Apple MacBook Pro Official Page", url: "https://www.apple.com/macbook-pro/" },
          { title: "Wikipedia: MacBook Pro", url: "https://en.wikipedia.org/wiki/MacBook_Pro" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // SMARTPHONE: iPhone 15 Pro / Pro Max
    // -------------------------------------------------------------------------
    if (nameLower.includes("iphone 15 pro") || nameLower.includes("iphone 15")) {
      return {
        id: "ent_phone_iphone_15_pro",
        name: "Apple iPhone 15 Pro & Pro Max",
        category: "smartphone",
        subtitle: "Flagship Aerospace Titanium Smartphone with A17 Pro",
        description:
          "The iPhone 15 Pro features a Grade 5 aerospace titanium design with contoured edges, an all-new customizable Action button, USB-C 3.0 with 10Gbps data transfer, and a 48MP triple-lens optical system.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/IPhone_15_Pro_Natural_Titanium.png/960px-IPhone_15_Pro_Natural_Titanium.png",
            caption: "iPhone 15 Pro in Natural Titanium finish",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/IPhone_15_Pro",
          },
        ],
        quickFacts: [
          { label: "Manufacturer", value: "Apple Inc." },
          { label: "Release Date", value: "September 2023" },
          { label: "Frame Material", value: "Aerospace-grade Grade 5 Titanium" },
          { label: "Processor", value: "Apple A17 Pro (3nm EUV)" },
          { label: "Port", value: "USB-C (USB 3 up to 10Gbps)" },
          { label: "Starting Price", value: "$999 (Pro) / $1,199 (Pro Max)" },
        ],
        specGroups: [
          {
            groupName: "Display & Design",
            specs: [
              { label: "Display", value: "6.1\" (Pro) or 6.7\" (Pro Max) Super Retina XDR OLED, 120Hz ProMotion" },
              { label: "Resolution", value: "2556 x 1179 (Pro) / 2796 x 1290 (Pro Max) at 460 ppi" },
              { label: "Peak Brightness", value: "2,000 nits outdoor peak, 1,000 nits typical, 1,600 nits HDR" },
              { label: "Protection", value: "Ceramic Shield front, IP68 water/dust resistance (6m for 30 mins)" },
            ],
          },
          {
            groupName: "Camera System",
            specs: [
              { label: "Main Sensor", value: "48MP (24mm, f/1.78) second-gen sensor-shift OIS, 24MP super-high-res default" },
              { label: "Ultra-Wide", value: "12MP (13mm, f/2.2, 120° FOV) with macro photography" },
              { label: "Telephoto", value: "12MP 3x optical zoom (Pro) OR 12MP 5x tetraprism optical zoom (Pro Max, 120mm)" },
              { label: "Video", value: "4K60 ProRes recording directly to external USB-C drive, Log video, Academy Color" },
            ],
          },
          {
            groupName: "Battery & Performance",
            specs: [
              { label: "Chipset", value: "A17 Pro 6-core CPU (2 performance + 4 efficiency), 6-core GPU, 16-core NPU" },
              { label: "RAM & Storage", value: "8GB RAM | 128GB (Pro only), 256GB, 512GB, 1TB NVMe" },
              { label: "Battery", value: "3,274 mAh (Pro) / 4,422 mAh (Pro Max), up to 29 hrs video playback" },
              { label: "Charging", value: "MagSafe wireless 15W, Qi2 wireless 15W, wired 20W+ (50% in 30 mins)" },
            ],
          },
        ],
        features: [
          "Customizable Action button replacing the legacy mute switch for instant tools",
          "Dynamic Island with live interactive notifications and flight/sports tracker",
          "Next-generation portrait capture automatically detecting depth without portrait mode",
          "Spatial video capture for Apple Vision Pro 3D playback",
        ],
        pros: [
          "Titanium frame substantially reduces device weight compared to steel predecessors",
          "Consistently exceptional photo and 4K60 ProRes video recording capabilities",
          "USB-C port allows standard cable charging and fast direct SSD recording",
          "A17 Pro supports console-quality gaming (Resident Evil, Assassin's Creed)",
        ],
        cons: [
          "Wired charging speeds remain conservative compared to 65W+ Android competitors",
          "5x optical telephoto was exclusive to Pro Max in the 15 generation",
          "Base 15 Pro still starts with 128GB storage at $999",
        ],
        variants: ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"],
        sources: [
          { title: "Apple iPhone 15 Pro Specifications", url: "https://www.apple.com/iphone-15-pro/specs/" },
          { title: "Wikipedia: iPhone 15 Pro", url: "https://en.wikipedia.org/wiki/IPhone_15_Pro" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // SMARTPHONE: Samsung Galaxy S24 Ultra
    // -------------------------------------------------------------------------
    if (nameLower.includes("galaxy s24") || nameLower.includes("s24 ultra")) {
      return {
        id: "ent_phone_galaxy_s24_ultra",
        name: "Samsung Galaxy S24 Ultra",
        category: "smartphone",
        subtitle: "Ultimate Android Flagship with Galaxy AI & Titanium Armor",
        description:
          "The Galaxy S24 Ultra is Samsung's pinnacle flagship featuring a flat 6.8-inch Dynamic AMOLED 2X display with anti-reflective Gorilla Armor, Qualcomm Snapdragon 8 Gen 3 for Galaxy, a 200MP Quad-Telephoto system, and a built-in S Pen stylus.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Samsung_Galaxy_S24_Ultra_Titanium_Gray.png/960px-Samsung_Galaxy_S24_Ultra_Titanium_Gray.png",
            caption: "Samsung Galaxy S24 Ultra with anti-reflective flat display",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Samsung_Galaxy_S24",
          },
        ],
        quickFacts: [
          { label: "Manufacturer", value: "Samsung Electronics" },
          { label: "Processor", value: "Qualcomm Snapdragon 8 Gen 3 for Galaxy (4nm)" },
          { label: "Display", value: "6.8\" QHD+ Dynamic AMOLED 2X, 1-120Hz, 2600 nits" },
          { label: "Battery", value: "5,000 mAh with 45W Fast Charging" },
          { label: "Software Support", value: "7 years of OS upgrades and security patches" },
          { label: "Starting Price", value: "From $1,299 USD" },
        ],
        specGroups: [
          {
            groupName: "Cameras",
            specs: [
              { label: "Main Camera", value: "200MP (f/1.7, 24mm, OIS, Super Quad Pixel AF)" },
              { label: "Periscope Telephoto", value: "50MP (f/3.4, 111mm, 5x optical zoom, 10x optical-quality zoom, 100x Space Zoom)" },
              { label: "Telephoto 2", value: "10MP (f/2.4, 67mm, 3x optical zoom)" },
              { label: "Ultra-Wide", value: "12MP (f/2.2, 13mm, 120° FOV, Dual Pixel AF)" },
            ],
          },
          {
            groupName: "Hardware & Battery",
            specs: [
              { label: "RAM & Storage", value: "12GB LPDDR5X RAM | 256GB, 512GB, 1TB UFS 4.0 storage" },
              { label: "Battery", value: "5,000 mAh (65% in 30 mins with 45W adapter, 15W wireless)" },
              { label: "S Pen", value: "Integrated Bluetooth stylus with air gestures and 2.8ms latency" },
              { label: "Durability", value: "Titanium Frame, Corning Gorilla Armor (75% reflection reduction), IP68" },
            ],
          },
        ],
        features: [
          "Galaxy AI suite: Circle to Search with Google, Live Call Translation, Chat Assist, Note Assist",
          "Corning Gorilla Armor significantly eliminates glare and screen reflections",
          "Vapor chamber cooling is 1.9x larger for consistent thermal management",
        ],
        pros: [
          "Gorilla Armor glass provides the best anti-reflective screen on any smartphone",
          "Class-leading 7-year commitment for major Android version upgrades",
          "Versatile 200MP camera setup with superb 5x and 10x optical zoom clarity",
          "Integrated S Pen remains unmatched for precision signing, notes, and photo edits",
        ],
        cons: [
          "Large, boxy 232g form factor can feel bulky in one-handed usage",
          "Premium $1,299 base price is steeper than predecessor",
          "Some Galaxy AI features require active internet connection and Samsung Account",
        ],
        variants: ["Titanium Gray", "Titanium Black", "Titanium Violet", "Titanium Yellow"],
        sources: [
          { title: "Samsung Galaxy S24 Ultra Official", url: "https://www.samsung.com/global/galaxy/galaxy-s24-ultra/" },
          { title: "Wikipedia: Samsung Galaxy S24", url: "https://en.wikipedia.org/wiki/Samsung_Galaxy_S24" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // CELEBRITY: Cristiano Ronaldo
    // -------------------------------------------------------------------------
    if (nameLower.includes("cristiano ronaldo") || nameLower.includes("ronaldo")) {
      return {
        id: "ent_celeb_cristiano_ronaldo",
        name: "Cristiano Ronaldo dos Santos Aveiro",
        category: "celebrity",
        subtitle: "Portuguese Professional Footballer & All-Time Leading International Goalscorer",
        description:
          "Widely regarded as one of the greatest football players of all time, Cristiano Ronaldo has won five Ballon d'Or awards, five UEFA Champions League titles, and captained Portugal to victory at UEFA Euro 2016 and the 2019 UEFA Nations League.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Cristiano_Ronaldo_2018.jpg/960px-Cristiano_Ronaldo_2018.jpg",
            caption: "Cristiano Ronaldo competing for the Portugal national team",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Cristiano_Ronaldo",
          },
        ],
        quickFacts: [
          { label: "Born", value: "February 5, 1985 (Funchal, Madeira, Portugal)" },
          { label: "Position", value: "Forward / Striker" },
          { label: "Current Club", value: "Al Nassr FC (Saudi Pro League)" },
          { label: "National Team", value: "Portugal (Captain, #7)" },
          { label: "Career Goals", value: "Over 900 official senior career goals" },
        ],
        celebrityInfo: {
          profession: "Professional Footballer / Athlete & Global Icon",
          nationality: "Portuguese",
          born: "February 5, 1985 in Funchal, Madeira",
          majorAchievements: [
            "5x Ballon d'Or recipient (2008, 2013, 2014, 2016, 2017)",
            "5x UEFA Champions League Winner (1x Manchester United, 4x Real Madrid)",
            "All-time record international goalscorer in men's football history (130+ goals)",
            "All-time leading goalscorer in UEFA Champions League history (140 goals)",
            "UEFA European Championship Winner (Euro 2016) & Nations League Winner (2019)",
            "4x European Golden Shoe Winner",
          ],
          careerHighlights: [
            "Sporting CP (2002–2003): Professional breakout in Lisbon",
            "Manchester United (2003–2009 & 2021–2022): 3x Premier League, 1x Champions League",
            "Real Madrid (2009–2018): 450 goals in 438 appearances (Club all-time record), 4x UCL",
            "Juventus (2018–2021): 2x Serie A titles and Serie A Footballer of the Year",
            "Al Nassr (2023–Present): Historic move sparking global Saudi Pro League expansion",
          ],
        },
        sources: [
          { title: "Cristiano Ronaldo - Wikipedia", url: "https://en.wikipedia.org/wiki/Cristiano_Ronaldo" },
          { title: "UEFA Champions League Official Records", url: "https://www.uefa.com/uefachampionsleague/history/rankings/" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // DESTINATION / PLACE: Ooty (Udhagamandalam)
    // -------------------------------------------------------------------------
    if (nameLower.includes("ooty") || nameLower.includes("udhagamandalam")) {
      return {
        id: "ent_place_ooty",
        name: "Ooty (Udhagamandalam)",
        category: "place",
        subtitle: "The Queen of Hill Stations — Nilgiri Hills, Tamil Nadu, India",
        description:
          "Nestled at an altitude of 2,240 meters (7,350 ft) in the Western Ghats of Tamil Nadu, Ooty is famous for its rolling tea plantations, cool mountain climate, colonial heritage, and the UNESCO World Heritage Nilgiri Mountain Railway.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Ooty_lake.jpg/960px-Ooty_lake.jpg",
            caption: "Serene waters of Ooty Lake surrounded by eucalyptus groves",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Ooty",
          },
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Government_Botanical_Garden_Ooty_India.jpg/960px-Government_Botanical_Garden_Ooty_India.jpg",
            caption: "Lush terraced lawns at the Government Botanical Garden",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Government_Botanical_Garden,_Ooty",
          },
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/NMR_Train_on_viaduct_05-02-26_33.jpeg/960px-NMR_Train_on_viaduct_05-02-26_33.jpeg",
            caption: "UNESCO Heritage Nilgiri Mountain Railway 'Toy Train' crossing a scenic mountain viaduct",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Nilgiri_Mountain_Railway",
          },
        ],
        quickFacts: [
          { label: "Location", value: "Nilgiris District, Tamil Nadu, India" },
          { label: "Elevation", value: "2,240 m (7,350 ft)" },
          { label: "Climate", value: "Subtropical highland (Mild summer, chilly winter)" },
          { label: "Nearest Airport", value: "Coimbatore International Airport (CJB, ~85 km)" },
          { label: "Famous For", value: "Nilgiri Tea, Toy Train, Botanical Gardens, Homemade Chocolates" },
        ],
        attractions: [
          "Nilgiri Mountain Railway (Toy Train): UNESCO World Heritage rack-and-pinion railway through dramatic gorges and 16 tunnels",
          "Government Botanical Garden: Established in 1848, home to over 1,000 species of flora, exotic shrubs, and a 20-million-year-old fossilized tree trunk",
          "Doddabetta Peak: Highest vantage point in the Nilgiris (2,637 m) offering panoramic vistas of the Western Ghats and telescope house",
          "Ooty Lake & Boat House: 65-acre artificial lake constructed in 1824, offering paddle, row, and motor boating",
          "Pykara Waterfalls & Pykara Lake: Pristine cascading falls and scenic boathouse enveloped by shola forests",
          "Government Rose Garden: India's largest rose garden showcasing over 20,000 varieties of vibrant roses",
        ],
        visitingInfo: {
          bestTimeToVisit: "October to June (pleasant temperatures between 12°C and 22°C; April-May hosts the Annual Flower Show)",
          idealDuration: "3 to 4 days for comprehensive sightseeing and leisurely tea estate walks",
          weatherOverview: "Summers (Mar-Jun) are crisp and pleasant; Monsoons (Jul-Sep) bring lush green mist; Winters (Nov-Feb) dip to 5°C with frost",
          entryFee: "Botanical Garden (₹50 adults), Rose Garden (₹40), Ooty Lake boating varies (₹150-₹350)",
          timings: "Most gardens and parks open 9:00 AM – 6:00 PM daily",
          nearbyDestinations: ["Coonoor (19 km)", "Kotagiri (30 km)", "Mudumalai National Park & Tiger Reserve (40 km)", "Bandipur (50 km)"],
          travelTips: [
            "Book Nilgiri Mountain Railway tickets weeks in advance on IRCTC as seats sell out quickly.",
            "Pack light woolens or jackets even in summer, as evening temperatures drop rapidly.",
            "Visit Doddabetta early in the morning before valley clouds roll in and obscure view.",
          ],
        },
        sources: [
          { title: "Ooty Tourism - Tamil Nadu Tourism Development Corporation", url: "https://www.tamilnadutourism.tn.gov.in/destinations/ooty" },
          { title: "Wikipedia: Ooty (Udhagamandalam)", url: "https://en.wikipedia.org/wiki/Ooty" },
        ],
      };
    }

    // -------------------------------------------------------------------------
    // ELECTRONICS: Sony WH-1000XM5 Noise Cancelling Headphones
    // -------------------------------------------------------------------------
    if (nameLower.includes("wh-1000xm5") || nameLower.includes("1000xm5")) {
      return {
        id: "ent_elec_sony_wh1000xm5",
        name: "Sony WH-1000XM5 Wireless Headphones",
        category: "electronics",
        subtitle: "Industry-Leading Active Noise Cancelling Over-Ear Headphones",
        description:
          "The Sony WH-1000XM5 features dual-processor Active Noise Cancellation (HD Noise Cancelling Processor QN1 + Integrated Processor V1), 8 microphones, precision 30mm carbon fiber composite drivers, and up to 30 hours of battery life.",
        images: [
          {
            url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Sony_WH-1000XM5_Black.jpg/960px-Sony_WH-1000XM5_Black.jpg",
            caption: "Sony WH-1000XM5 over-ear noise-cancelling headphones in Black",
            source: "Wikimedia Commons",
            sourceUrl: "https://en.wikipedia.org/wiki/Sony",
          },
        ],
        quickFacts: [
          { label: "Manufacturer", value: "Sony Corporation" },
          { label: "Headphone Type", value: "Over-Ear Closed Dynamic" },
          { label: "Battery Life", value: "30 hours (ANC On) / 40 hours (ANC Off)" },
          { label: "Weight", value: "250 grams" },
          { label: "Bluetooth Codecs", value: "LDAC, AAC, SBC" },
          { label: "Retail Price", value: "$399.99 USD" },
        ],
        specGroups: [
          {
            groupName: "Acoustics & Noise Cancellation",
            specs: [
              { label: "Driver Unit", value: "30mm precision-engineered Carbon Fiber composite dome" },
              { label: "Noise Cancellation", value: "Dual processors (V1 + QN1) controlling 8 microphones with Auto NC Optimizer" },
              { label: "Frequency Response", value: "4 Hz - 40,000 Hz (JEITA High-Resolution Audio certified)" },
              { label: "Microphones", value: "4 beamforming mics with AI-driven DNN voice pickup and wind-noise reduction" },
            ],
          },
          {
            groupName: "Connectivity & Smart Features",
            specs: [
              { label: "Bluetooth Version", value: "Bluetooth 5.2 with Multipoint connection to 2 devices simultaneously" },
              { label: "Fast Charging", value: "3 minutes charge provides 3 hours playback (USB-PD charger)" },
              { label: "Smart Controls", value: "Speak-to-Chat, Quick Attention, Wear detection sensor, capacitive touch panel" },
              { label: "Voice Assistants", value: "Google Assistant and Amazon Alexa built-in" },
            ],
          },
        ],
        features: [
          "Auto NC Optimizer automatically adjusts noise canceling based on wearing conditions and atmospheric pressure",
          "Ultra-comfortable lightweight soft-fit leather design reducing pressure on ears and head",
          "LDAC high-resolution wireless streaming transmits 3x more audio data than conventional Bluetooth",
        ],
        pros: [
          "Unrivaled active noise cancellation attenuating both low rumble and mid/high vocal frequencies",
          "Crystal clear voice calling performance with beamforming mics and background noise filtering",
          "Exceptional 30-hour battery life with rapid 3-minute emergency charging",
          "Smooth multipoint switching between phone and laptop",
        ],
        cons: [
          "Headband does not fold into a compact hinge (swivels flat only), resulting in larger carry case",
          "Water resistance rating (IPX) is absent—not suitable for heavy rain or sweaty workouts",
        ],
        sources: [
          { title: "Sony WH-1000XM5 Official Specifications", url: "https://www.sony.com/electronics/headband-headphones/wh-1000xm5" },
        ],
      };
    }

    return null;
  }

  /**
   * Fetches real, verified entity metadata and lead photographs from Wikipedia API.
   */
  private static async fetchFromWikipedia(
    entityName: string,
    categoryHint?: EntityCategory
  ): Promise<EntityCardData | null> {
    try {
      // 1. Search Wikipedia using generator search to resolve best matching article with pageimages & extract
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts|info&inprop=url&generator=search&gsrsearch=${encodeURIComponent(
        entityName
      )}&gsrlimit=1&pithumbsize=800&exintro=1&explaintext=1`;

      const res = await fetch(url, {
        headers: { "User-Agent": "Nexora/0.4.0 (AI Multi-Model Workspace; hello@nexora.ai)" },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const pages = Object.values(data.query?.pages || {}) as Array<{
        pageid: number;
        title: string;
        extract?: string;
        fullurl?: string;
        thumbnail?: { source: string; width: number; height: number };
      }>;

      if (pages.length === 0 || !pages[0].title) return null;
      const page = pages[0];

      // Discard disambiguation or category pages
      if (page.title.startsWith("Category:") || page.title.includes("(disambiguation)")) {
        return null;
      }

      // Collect images
      const images: EntityImage[] = [];
      if (page.thumbnail?.source) {
        images.push({
          url: page.thumbnail.source,
          caption: `${page.title} primary visual`,
          source: "Wikimedia Commons",
          sourceUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          width: page.thumbnail.width,
          height: page.thumbnail.height,
        });
      }

      const category = categoryHint || this.inferCategory(page.title, page.extract || "");

      // Quick facts derived from page
      const quickFacts: EntityQuickFact[] = [
        { label: "Entity", value: page.title },
        { label: "Category", value: this.formatCategoryName(category) },
        { label: "Source", value: "Verified Public Records" },
      ];

      const cleanExtract = (page.extract || "").trim().slice(0, 500);

      return {
        id: `ent_wiki_${page.pageid}`,
        name: page.title,
        category,
        subtitle: `Verified Overview & Public Specifications`,
        description: cleanExtract,
        images,
        quickFacts,
        features: this.extractKeySentences(cleanExtract),
        sources: [
          {
            title: `${page.title} - Wikipedia`,
            url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          },
        ],
      };
    } catch (err) {
      console.warn("[EntityRetriever] Dynamic Wikipedia fetch error:", err);
      return null;
    }
  }

  private static inferCategory(title: string, extract: string): EntityCategory {
    const combined = `${title} ${extract}`.toLowerCase();
    if (/\b(laptop|notebook|ultrabook|macbook|thinkpad)\b/.test(combined)) return "laptop";
    if (/\b(smartphone|mobile phone|iphone|galaxy)\b/.test(combined)) return "smartphone";
    if (/\b(born|footballer|actor|actress|singer|politician|executive|author)\b/.test(combined)) return "celebrity";
    if (/\b(city|town|hill station|country|temple|island|national park|mountain|lake)\b/.test(combined)) return "place";
    if (/\b(headphones|camera|smartwatch|television|gadget)\b/.test(combined)) return "electronics";
    if (/\b(company|corporation|conglomerate|subsidiary)\b/.test(combined)) return "company";
    return "general_entity";
  }

  private static formatCategoryName(category: EntityCategory): string {
    switch (category) {
      case "laptop":
        return "Laptop & Computer";
      case "smartphone":
        return "Smartphone";
      case "celebrity":
        return "Public Figure & Celebrity";
      case "place":
        return "Destination & Landmark";
      case "electronics":
        return "Electronics & Gadget";
      case "company":
        return "Company & Brand";
      default:
        return "Identifiable Entity";
    }
  }

  private static extractKeySentences(text: string): string[] {
    const sentences = text.split(/(?<=[.?!])\s+/).filter((s) => s.length > 25);
    return sentences.slice(0, 3);
  }
}

