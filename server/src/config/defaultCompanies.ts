export interface ICompanyDefinition {
  name: string;
  description: string;
}

export const TECHNOLOGY_COMPANIES: ICompanyDefinition[] = [
  {
    name: 'Apple Inc.',
    description: 'Apple designs consumer electronics, software, and digital services used worldwide. Its flagship products include the iPhone, Mac, iPad, and Apple Watch.',
  },
  {
    name: 'Microsoft Corporation',
    description: 'Microsoft develops operating systems, productivity software, and cloud computing solutions. The company is known for Windows, Microsoft 365, Azure, and AI technologies.',
  },
  {
    name: 'Amazon.com Inc.',
    description: "Amazon operates one of the world's largest e-commerce platforms and serves millions of customers globally. It also leads the cloud computing industry through Amazon Web Services (AWS).",
  },
  {
    name: 'Alphabet Inc. (Google)',
    description: 'Alphabet is the parent company of Google and offers search, advertising, cloud, and AI services. Its platforms include YouTube, Google Search, Gmail, and Android.',
  },
  {
    name: 'Meta Platforms Inc.',
    description: 'Meta owns Facebook, Instagram, WhatsApp, and other social networking services. The company focuses on digital communication, advertising, and virtual reality technologies.',
  },
  {
    name: 'Nvidia Corporation',
    description: 'Nvidia develops advanced graphics processors and AI computing hardware. Its products are widely used in gaming, data centres, and artificial intelligence applications.',
  },
  {
    name: 'Intel Corporation',
    description: 'Intel is a leading semiconductor manufacturer producing processors and computing hardware. Its technology powers personal computers, servers, and enterprise systems worldwide.',
  },
  {
    name: 'Advanced Micro Devices (AMD)',
    description: "AMD designs high-performance processors and graphics cards for consumers and businesses. The company's products compete directly with major semiconductor manufacturers globally.",
  },
  {
    name: 'Cisco Systems',
    description: 'Cisco provides networking equipment, cybersecurity solutions, and communication technologies. Its products support internet connectivity and enterprise digital infrastructure.',
  },
  {
    name: 'Oracle Corporation',
    description: 'Oracle develops database software and cloud-based business solutions. Its technologies are widely used by companies for managing data and operations.',
  },
  {
    name: 'Salesforce Inc.',
    description: 'Salesforce offers cloud-based customer relationship management software for businesses. Its platform helps organisations improve customer engagement and sales performance.',
  },
  {
    name: 'Adobe Inc.',
    description: 'Adobe creates digital media and creative software used by professionals worldwide. Popular products include Photoshop, Illustrator, Acrobat, and Premiere Pro.',
  },
  {
    name: 'IBM Corporation',
    description: 'IBM provides enterprise computing, cloud services, and technology consulting solutions. The company also invests heavily in artificial intelligence and business automation.',
  },
  {
    name: 'SAP SE',
    description: 'SAP develops enterprise software that helps businesses manage operations efficiently. Its systems are widely used in finance, supply chain, and human resources management.',
  },
  {
    name: 'Accenture plc',
    description: 'Accenture is a global consulting company specialising in technology and digital transformation. It helps organisations improve efficiency through innovation and strategic planning.',
  },
  {
    name: 'Qualcomm Inc.',
    description: 'Qualcomm develops wireless communication technologies and semiconductor products. Its chips are widely used in smartphones and telecommunications devices.',
  },
  {
    name: 'Broadcom Inc.',
    description: 'Broadcom manufactures semiconductor and infrastructure software solutions. The company serves industries including networking, cybersecurity, and telecommunications.',
  },
  {
    name: 'Micron Technology',
    description: 'Micron produces memory and storage solutions for computing devices. Its products are essential for smartphones, computers, and data centres.',
  },
  {
    name: 'Texas Instruments',
    description: 'Texas Instruments designs analog semiconductors and embedded processing technologies. Its products are used across industrial, automotive, and consumer applications.',
  },
  {
    name: 'Applied Materials',
    description: 'Applied Materials supplies equipment used in semiconductor manufacturing processes. The company plays an important role in advancing chip production technologies.',
  },
  {
    name: 'ASML Holding',
    description: 'ASML manufactures advanced lithography systems used in semiconductor fabrication. Its machines are critical for producing modern computer chips.',
  },
  {
    name: 'Taiwan Semiconductor Manufacturing Company (TSMC)',
    description: "TSMC is the world's leading semiconductor foundry company. It manufactures chips for major technology firms globally.",
  },
  {
    name: 'Sony Corporation',
    description: 'Sony develops electronics, gaming products, and entertainment content. The company is known for PlayStation consoles, cameras, and media operations.',
  },
  {
    name: 'Samsung Electronics',
    description: 'Samsung produces smartphones, consumer electronics, and semiconductor products. It is one of the largest technology manufacturers in the world.',
  },
  {
    name: 'Hewlett Packard Enterprise',
    description: 'HPE provides enterprise IT infrastructure and cloud computing solutions. Its offerings help organisations manage large-scale digital operations.',
  },
  {
    name: 'Dell Technologies',
    description: 'Dell develops personal computers, servers, and business technology solutions. The company serves both individual consumers and enterprise customers.',
  },
  {
    name: 'PayPal Holdings',
    description: 'PayPal operates a global online payments platform for consumers and businesses. Its digital services support secure financial transactions worldwide.',
  },
  {
    name: 'Block Inc. (Square)',
    description: 'Block provides digital payment systems and financial technology solutions. Its products help businesses process transactions and manage finances efficiently.',
  },
  {
    name: 'Shopify Inc.',
    description: 'Shopify offers software that enables businesses to create and manage online stores. Its platform supports e-commerce operations for merchants across the world.',
  },
  {
    name: 'ServiceNow Inc.',
    description: 'ServiceNow develops workflow automation software for enterprises. Its solutions improve productivity and streamline business processes.',
  },
  {
    name: 'Zoom Video Communications',
    description: 'Zoom provides cloud-based video conferencing and communication services. The platform is widely used for virtual meetings and remote collaboration.',
  },
  {
    name: 'Dropbox Inc.',
    description: 'Dropbox offers cloud storage and file-sharing solutions for individuals and organisations. Its services enable secure access to digital content from anywhere.',
  },
  {
    name: 'Workday Inc.',
    description: 'Workday develops software for human resources and financial management. Its cloud-based solutions help businesses manage workforce operations efficiently.',
  },
  {
    name: 'Snowflake Inc.',
    description: 'Snowflake provides a cloud data platform for storing and analysing information. Its technology enables organisations to make data-driven decisions.',
  },
  {
    name: 'Atlassian Corporation',
    description: 'Atlassian develops collaboration and project management software tools. Products such as Jira and Confluence are widely used by organisations worldwide.',
  },
  {
    name: 'Electronic Arts (EA)',
    description: 'Electronic Arts develops and publishes video games across multiple platforms. The company owns several popular gaming franchises and online services.',
  },
  {
    name: 'Activision Blizzard',
    description: 'Activision Blizzard is a major video game developer and publisher. Its titles attract millions of players across global gaming markets.',
  },
  {
    name: 'Autodesk Inc.',
    description: 'Autodesk creates software used for engineering, construction, and design projects. Its tools help professionals develop accurate digital models and plans.',
  },
  {
    name: 'Infosys Limited',
    description: 'Infosys provides IT consulting, outsourcing, and digital transformation services. The company serves clients across numerous industries globally.',
  },
  {
    name: 'Tata Consultancy Services (TCS)',
    description: 'TCS offers information technology and business consulting services worldwide. It helps organisations implement digital solutions and improve operational efficiency.',
  },
];

export const NON_TECHNOLOGY_COMPANIES: ICompanyDefinition[] = [
  {
    name: 'Johnson & Johnson',
    description: 'Johnson & Johnson develops healthcare products, pharmaceuticals, and medical devices. The company serves consumers and healthcare providers across the globe.',
  },
  {
    name: 'Pfizer Inc.',
    description: 'Pfizer researches, develops, and manufactures pharmaceutical products. Its medicines and vaccines address a wide range of medical conditions.',
  },
  {
    name: 'Merck & Co.',
    description: 'Merck is a research-driven healthcare company focused on innovative medicines. It operates in pharmaceuticals, vaccines, and animal health products.',
  },
  {
    name: 'Abbott Laboratories',
    description: 'Abbott develops medical devices, diagnostics, and nutritional products. The company works to improve healthcare outcomes globally.',
  },
  {
    name: 'Danaher Corporation',
    description: 'Danaher provides scientific, medical, and industrial technologies. Its products support life sciences research and healthcare innovation.',
  },
  {
    name: 'Medtronic plc',
    description: 'Medtronic develops medical devices used in disease treatment and patient care. The company specialises in cardiovascular, neurological, and surgical technologies.',
  },
  {
    name: 'Bristol Myers Squibb',
    description: 'Bristol Myers Squibb researches and manufactures pharmaceutical products. It focuses on treatments for cancer, cardiovascular diseases, and immune disorders.',
  },
  {
    name: 'Eli Lilly and Company',
    description: 'Eli Lilly develops medicines for diabetes, oncology, and other health conditions. The company invests heavily in pharmaceutical research and innovation.',
  },
  {
    name: 'Visa Inc.',
    description: 'Visa operates a global electronic payment network connecting consumers and merchants. Its technology enables secure and efficient financial transactions.',
  },
  {
    name: 'Mastercard Inc.',
    description: 'Mastercard provides payment processing services in countries worldwide. The company supports digital commerce through advanced financial technologies.',
  },
  {
    name: 'JPMorgan Chase & Co.',
    description: 'JPMorgan Chase is one of the largest banking institutions globally. It offers banking, investment, and wealth management services.',
  },
  {
    name: 'Bank of America',
    description: 'Bank of America provides financial solutions for individuals and businesses. Its services include lending, investments, and consumer banking.',
  },
  {
    name: 'Goldman Sachs',
    description: 'Goldman Sachs specialises in investment banking and asset management services. The company serves corporations, governments, and investors globally.',
  },
  {
    name: 'Morgan Stanley',
    description: 'Morgan Stanley provides wealth management and investment banking services. It is recognised as a leading global financial institution.',
  },
  {
    name: 'BlackRock',
    description: "BlackRock is the world's largest asset management company. It helps investors manage portfolios through investment and risk-management services.",
  },
  {
    name: 'American Express',
    description: 'American Express offers credit cards and financial services worldwide. The company is known for premium payment and travel-related solutions.',
  },
  {
    name: 'ExxonMobil',
    description: "ExxonMobil explores, produces, and refines oil and natural gas resources. It is among the world's largest integrated energy companies.",
  },
  {
    name: 'Chevron Corporation',
    description: 'Chevron operates across energy exploration, production, and refining activities. The company supplies fuel and energy products worldwide.',
  },
  {
    name: 'Shell plc',
    description: 'Shell is a multinational energy company involved in oil, gas, and renewable energy. It serves customers across numerous international markets.',
  },
  {
    name: 'BP plc',
    description: 'BP explores and produces energy resources while investing in sustainable energy initiatives. The company operates in many countries globally.',
  },
  {
    name: 'TotalEnergies',
    description: 'TotalEnergies produces oil, gas, and renewable energy solutions. The company is expanding its presence in cleaner energy technologies.',
  },
  {
    name: 'ConocoPhillips',
    description: 'ConocoPhillips focuses on oil and natural gas exploration and production. It maintains operations across multiple energy-rich regions.',
  },
  {
    name: 'Boeing Company',
    description: 'Boeing designs and manufactures commercial aircraft, defence systems, and space technologies. Its products are used by airlines and governments worldwide.',
  },
  {
    name: 'Airbus SE',
    description: 'Airbus develops commercial aircraft and aerospace technologies. The company is one of the largest aircraft manufacturers globally.',
  },
  {
    name: 'General Electric',
    description: 'General Electric produces industrial equipment and energy-related technologies. It has a long history of innovation across multiple industries.',
  },
  {
    name: 'Caterpillar Inc.',
    description: 'Caterpillar manufactures construction, mining, and heavy-duty equipment. Its machinery supports infrastructure and resource development worldwide.',
  },
  {
    name: 'Deere & Company',
    description: 'Deere develops agricultural and construction equipment for global markets. Its products improve productivity in farming and land management.',
  },
  {
    name: 'Honeywell International',
    description: 'Honeywell provides aerospace, industrial, and automation technologies. The company helps businesses improve efficiency and operational performance.',
  },
  {
    name: 'Lockheed Martin',
    description: 'Lockheed Martin develops advanced defence, aerospace, and security systems. It serves military and government clients across the world.',
  },
  {
    name: 'Raytheon Technologies',
    description: 'Raytheon designs aerospace and defence technologies for global customers. Its products include missiles, sensors, and aviation systems.',
  },
  {
    name: 'Verizon Communications',
    description: 'Verizon provides wireless communication and internet services. The company serves millions of residential and business customers.',
  },
  {
    name: 'AT&T Inc.',
    description: 'AT&T offers telecommunications, internet, and digital communication services. Its network infrastructure supports consumers and enterprises globally.',
  },
  {
    name: 'FedEx Corporation',
    description: 'FedEx provides transportation, logistics, and express delivery services. It connects businesses and consumers through a global shipping network.',
  },
  {
    name: 'United Parcel Service (UPS)',
    description: 'UPS specialises in package delivery and supply chain management solutions. Its logistics network serves customers in numerous countries.',
  },
  {
    name: 'DHL Group',
    description: 'DHL offers international courier, logistics, and freight transportation services. The company is recognised for its extensive global delivery network.',
  },
  {
    name: 'Walmart Inc.',
    description: "Walmart operates one of the largest retail chains in the world. The company offers a wide range of products through physical and online stores.",
  },
  {
    name: 'Costco Wholesale',
    description: 'Costco operates membership-based warehouse retail stores globally. It is known for bulk sales, competitive pricing, and customer value.',
  },
  {
    name: 'Target Corporation',
    description: 'Target is a major retail company offering household, fashion, and consumer products. It serves customers through stores and e-commerce platforms.',
  },
  {
    name: 'Home Depot',
    description: 'Home Depot specialises in home improvement and construction products. It serves homeowners, contractors, and businesses across markets.',
  },
  {
    name: 'Procter & Gamble',
    description: 'Procter & Gamble manufactures consumer goods used in households worldwide. Its brands cover personal care, hygiene, and cleaning products.',
  },
];

export const ALL_DEFAULT_COMPANIES: ICompanyDefinition[] = [
  ...TECHNOLOGY_COMPANIES,
  ...NON_TECHNOLOGY_COMPANIES,
];

export const DEFAULT_COMPANY_NAMES: string[] = ALL_DEFAULT_COMPANIES.map((c) => c.name);
