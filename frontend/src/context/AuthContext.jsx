import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchNotifications, createNotification, markAllNotificationsRead } from '../services/api';

const AuthContext = createContext();

export const ROLES = {
  REQUIRING_BODY: {
    id: 'requiring_body',
    label: 'Land Requiring Body (NHAI / Railways / Ministry)',
    badge: 'Project Proposer',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Submit land acquisition proposals, rectify proposals & track project progress',
    allowedTabs: ['dashboard', 'proposal', 'workflow', 'gis', 'documents'],
    defaultTab: 'proposal',
    authorizedSteps: []
  },
  COLLECTOR: {
    id: 'collector',
    label: 'District Collectorate / District Administration',
    badge: 'District Collector',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Scrutinize Step 1 proposals & conduct Step 3 Public Hearing evaluations',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'grievances', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [2, 6, 10]
  },
  STATE_GOV: {
    id: 'state_gov',
    label: 'State Government / Revenue Department',
    badge: 'State Revenue Dept',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Authorize Step 2 Social Impact Notifications & Step 4 Gazette Declarations',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [4, 7]
  },
  SLAO: {
    id: 'slao',
    label: 'Land Acquiring Authority (Special Land Acquisition Officer)',
    badge: 'SLAO Officer',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    description: 'Determine & approve Step 5 Land Valuation Awards',
    allowedTabs: ['dashboard', 'workflow', 'scrutiny', 'gis', 'documents'],
    defaultTab: 'scrutiny',
    authorizedSteps: [8]
  },
  PFMS_OFFICER: {
    id: 'pfms_officer',
    label: 'Public Financial Management System Officer (Finance)',
    badge: 'Finance Officer',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Authorize & disburse Step 6 Direct Benefit Transfer compensation payments',
    allowedTabs: ['dashboard', 'compensation', 'workflow', 'gis'],
    defaultTab: 'compensation',
    authorizedSteps: []
  },
  RR_OFFICER: {
    id: 'rr_officer',
    label: 'Rehabilitation & Resettlement Commissioner',
    badge: 'R&R Commissioner',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'Manage & authorize Step 7 R&R family welfare housing packages',
    allowedTabs: ['dashboard', 'rr', 'workflow', 'gis'],
    defaultTab: 'rr',
    authorizedSteps: [3]
  },
  SURVEYOR: {
    id: 'surveyor',
    label: 'Cadastral Field Surveyor / Land Inspector',
    badge: 'Field Inspector',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Conduct ground inspections, capture GPS coordinates & boundary tags',
    allowedTabs: ['dashboard', 'field', 'workflow'],
    defaultTab: 'field',
    authorizedSteps: [5]
  },
  CITIZEN: {
    id: 'citizen',
    label: 'Affected Landowner / Citizen',
    badge: 'Public Landowner',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Public land parcel lookup, award statement lookup & grievance redressal',
    allowedTabs: ['dashboard', 'citizen', 'gis'],
    defaultTab: 'citizen',
    authorizedSteps: []
  }
};

const translations = {
  "(": "(",
  "portalTitle": "पोर्टल शीर्षक",
  "welcome": "स्वागत है",
  "desc": "विवरण",
  "Infrastructure Project": "बुनियादी ढांचा परियोजना",
  "Acquired Plot Area": "अधिग्रहित भूखंड क्षेत्र",
  "Land Category & Rate": "भूमि श्रेणी और दर",
  "RFCTLARR Statutory Multiplier": "RFCTLARR वैधानिक गुणक",
  "Acquisition Status": "अधिग्रहण स्थिति",
  "Statutory Section 19 Approved": "वैधानिक धारा 19 स्वीकृत",
  "Computed dynamically from acquired area": "अधिग्रहित क्षेत्र से गतिशील रूप से परिकलित",
  "Calculated Land Value": "परिकलित भूमि मूल्य",
  "Net Statutory Award": "शुद्ध वैधानिक पुरस्कार",
  "Total Compensation Payable": "कुल देय मुआवजा",
  "PFMS Direct Benefit Transfer (DBT) Treasury Ledger": "PFMS प्रत्यक्ष लाभ हस्तांतरण (DBT) ट्रेजरी खाता",
  "Total Disbursed to Bank": "बैंक में कुल संवितरित",
  "PFMS Treasury Batch Clearance": "PFMS ट्रेजरी बैच निकासी",
  "Included Solatium Bonus": "शामिल सोलेशियम बोनस",
  "Online Grievance & Appeal Redressal": "ऑनलाइन शिकायत और अपील निवारण",
  "Submit Petition to Collectorate": "कलेक्ट्रेट में याचिका प्रस्तुत करें",
  "Role Restriction: Only PFMS Finance Officers or SLAO/Collectors can authorize payouts.": "भूमिका प्रतिबंध: केवल PFMS वित्त अधिकारी या SLAO/कलेक्टर ही भुगतान अधिकृत कर सकते हैं।",
  "Stage 6 Marked as Completed!": "चरण 6 पूर्ण के रूप में चिह्नित!",
  "PFMS API Direct Benefit Transfer (DBT) Portal": "PFMS API प्रत्यक्ष लाभ हस्तांतरण (DBT) पोर्टल",
  "Section 24 Lapse Warning": "धारा 24 व्यपगत चेतावनी",
  "Direct Benefit Transfer execution requires PFMS Finance Nodal Officer or SLAO role. Switch active persona from the top header to disburse payments.": "प्रत्यक्ष लाभ हस्तांतरण निष्पादन के लिए PFMS वित्त नोडल अधिकारी या SLAO भूमिका की आवश्यकता है। भुगतान संवितरित करने के लिए शीर्ष हेडर से सक्रिय व्यक्तित्व बदलें।",
  "PFMS Gateway Locked (Project Stage Pending)": "PFMS गेटवे लॉक (परियोजना चरण लंबित)",
  "Land Valuation Calculator": "भूमि मूल्यांकन कैलकुलेटर",
  "Multiplied Base Value": "गुणित आधार मूल्य",
  "Total Award Amount": "कुल पुरस्कार राशि",
  "Landowner & Village": "भूस्वामी और गांव",
  "Survey No": "सर्वेक्षण संख्या",
  "Total Assessed Award": "कुल आकलित पुरस्कार",
  "Disbursement Status": "संवितरण स्थिति",
  "PFMS Action": "PFMS कार्रवाई",
  "Paid": "भुगतान किया",
  "Loading Document Repository...": "दस्तावेज़ रिपॉजिटरी लोड हो रहा है...",
  "Digital Repository & E-Signed Verification Vault": "डिजिटल रिपॉजिटरी और ई-हस्ताक्षरित सत्यापन वॉल्ट",
  "Secure PDF document upload repository with version control and document audit history.": "संस्करण नियंत्रण और दस्तावेज़ ऑडिट इतिहास के साथ सुरक्षित पीडीएफ दस्तावेज़ अपलोड रिपॉजिटरी।",
  "Upload PDF Document": "पीडीएफ दस्तावेज़ अपलोड करें",
  "Document Repository & Versions": "दस्तावेज़ रिपॉजिटरी और संस्करण",
  "Upload Official Statutory PDF File": "आधिकारिक वैधानिक पीडीएफ फाइल अपलोड करें",
  "PDF Files Only (Max 25MB)": "केवल पीडीएफ फाइलें (अधिकतम 25MB)",
  "Initial Proposal Dossier": "प्रारंभिक प्रस्ताव डोजियर",
  "Social Impact Study Report": "सामाजिक प्रभाव अध्ययन रिपोर्ट",
  "Preliminary Gazette Notification": "प्रारंभिक राजपत्र अधिसूचना",
  "Final Acquisition Declaration Gazette": "अंतिम अधिग्रहण घोषणा राजपत्र",
  "Land Valuation & Award Dossier": "भूमि मूल्यांकन और पुरस्कार डोजियर",
  "Rehabilitation Housing Master Plan": "पुनर्वास आवास मास्टर प्लान",
  "Click here to Select PDF File or Drag & Drop File": "पीडीएफ फाइल चुनने या फाइल को खींचने और छोड़ने के लिए यहां क्लिक करें",
  "Supports PDF format (Max 25 MB)": "पीडीएफ प्रारूप (अधिकतम 25 एमबी) का समर्थन करता है",
  "Document Title & File": "दस्तावेज़ शीर्षक और फ़ाइल",
  "Version": "संस्करण",
  "Category": "श्रेणी",
  "Verification Status": "सत्यापन स्थिति",
  "Uploaded Authority": "अपलोड प्राधिकरण",
  "Action": "कार्रवाई",
  "Verified": "सत्यापित",
  "View PDF": "पीडीएफ देखें",
  "Archived": "संग्रहीत",
  "View Archive": "संग्रह देखें",
  "Could not resolve location coordinates. Please try another result.": "स्थान निर्देशांक हल नहीं हो सका। कृपया कोई अन्य परिणाम आज़माएं।",
  "Geolocation not supported in browser.": "ब्राउज़र में जियोलोकेशन समर्थित नहीं है।",
  "Please enter valid numerical Latitude and Longitude values.": "कृपया मान्य संख्यात्मक अक्षांश और देशांतर मान दर्ज करें।",
  "Please enter a valid 14-digit ULPIN code": "कृपया एक मान्य 14-अंकीय ULPIN कोड दर्ज करें",
  "Select a parcel": "एक पार्सल चुनें",
  "Role Restriction: Only Field Surveyors or District SLAOs can map new land parcels.": "भूमिका प्रतिबंध: केवल फील्ड सर्वेक्षक या जिला SLAO ही नए भूमि पार्सल मैप कर सकते हैं।",
  "Pipeline Restriction: Field Surveys legally restricted until Section 11 Preliminary Notification (Stage 4) is published.": "पाइपलाइन प्रतिबंध: धारा 11 प्रारंभिक अधिसूचना (चरण 4) प्रकाशित होने तक फील्ड सर्वेक्षण कानूनी रूप से प्रतिबंधित हैं।",
  "A valid land boundary polygon must have at least 3 corner vertices.": "एक वैध भूमि सीमा बहुभुज में कम से कम 3 कोने होने चाहिए।",
  "Submitting ground survey reports requires Field Surveyor persona. Switch active persona from the header dropdown to upload reports.": "ग्राउंड सर्वे रिपोर्ट जमा करने के लिए फील्ड सर्वेयर की भूमिका आवश्यक है। रिपोर्ट अपलोड करने के लिए हेडर ड्रॉपडाउन से सक्रिय व्यक्तित्व को बदलें।",
  "LARR 2013 Field Inspection Report": "LARR 2013 फील्ड निरीक्षण रिपोर्ट",
  "Select Parcel to Inspect": "निरीक्षण के लिए पार्सल चुनें",
  "Land Type": "भूमि प्रकार",
  "Irrigated": "सिंचित",
  "Unirrigated": "असिंचित",
  "Barren": "बंजर",
  "Forest": "वन",
  "Affected Families": "प्रभावित परिवार",
  "Trees (Valuable)": "पेड़ (मूल्यवान)",
  "Inspection Notes": "निरीक्षण नोट्स",
  "Map Custom Multi-Vertex Land Boundary": "कस्टम मल्टी-वर्टेक्स भूमि सीमा मैप करें",
  "Suburban Residential House": "उपनगरीय आवासीय घर",
  "Roadside Commercial Shop": "सड़क के किनारे वाणिज्यिक दुकान",
  "Irrigated Agricultural Farm": "सिंचित कृषि फार्म",
  "Fruit Orchard Estate": "फलों के बाग एस्टेट",
  "Industrial Logistics Park": "औद्योगिक रसद पार्क",
  "Solar Photovoltaic Grid Zone": "सौर फोटोवोल्टिक ग्रिड ज़ोन",
  "Device GPS": "डिवाइस जीपीएस",
  "Add Red Pin to Boundary": "सीमा में लाल पिन जोड़ें",
  "Save Multi-Vertex Land Parcel to Map": "मल्टी-वर्टेक्स भूमि पार्सल को मानचित्र में सहेजें",
  "Searching...": "खोज रहा है...",
  "Standard Map": "मानक मानचित्र",
  "Satellite": "उपग्रह",
  "Jump to Land Parcel...": "भूमि पार्सल पर जाएं...",
  "Compliance Audit Trail": "अनुपालन ऑडिट ट्रेल",
  "North-West Corner": "उत्तर-पश्चिम कोना",
  "North-East Corner": "उत्तर-पूर्व कोना",
  "South-West Corner": "दक्षिण-पश्चिम कोना",
  "South-East Corner": "दक्षिण-पूर्व कोना",
  "Parcel Status Legend": "पार्सल स्थिति किंवदंती",
  "Possessed": "कब्जे में",
  "Awarded": "पुरस्कृत",
  "Notified": "अधिसूचित",
  "Disputed": "विवादित",
  "Satellite View": "सैटेलाइट व्यू",
  "Secure Ministry Gateway": "सुरक्षित मंत्रालय गेटवे",
  "Role-based Access Control": "भूमिका-आधारित पहुंच नियंत्रण",
  "LARR Act 2013 Compliant": "LARR अधिनियम 2013 अनुपालन",
  "Better Tomorrow": "बेहतर कल",
  "Welcome to": "स्वागत है",
  "A Unified Digital Platform for Land Acquisition & Management": "भूमि अधिग्रहण और प्रबंधन के लिए एक एकीकृत डिजिटल प्लेटफॉर्म",
  "Choose your role to continue": "जारी रखने के लिए अपनी भूमिका चुनें",
  "Access your account to continue": "जारी रखने के लिए अपना खाता एक्सेस करें",
  "Email Address": "ईमेल पता",
  "Remember Me": "मुझे याद रखें",
  "Forgot Password?": "पासवर्ड भूल गए?",
  "Acquired": "अधिग्रहित",
  "Compensation Disbursed": "मुआवजा वितरित",
  "a": "एक",
  "National Monitoring & Decision Support": "राष्ट्रीय निगरानी और निर्णय समर्थन",
  "Total Proposed Land": "कुल प्रस्तावित भूमि",
  "Out of Total Budget": "कुल बजट में से",
  "Affected & Displaced Families": "प्रभावित और विस्थापित परिवार",
  "R&R Housing Allotment Enrolled": "आर एंड आर आवास आवंटन नामांकित",
  "Active Strategic Projects": "सक्रिय रणनीतिक परियोजनाएं",
  "National Projects": "राष्ट्रीय परियोजनाएं",
  "SLA Adherence Index": "SLA अनुपालन सूचकांक",
  "RFCTLARR Compliant": "RFCTLARR अनुपालन",
  "State-Wise Land Acquisition Progress (Hectares)": "राज्यवार भूमि अधिग्रहण प्रगति (हेक्टेयर)",
  "Land Parcel Status Breakdown": "भूमि पार्सल स्थिति विवरण",
  "Current Lifecycle Distribution of Parcels": "पार्सल का वर्तमान जीवनचक्र वितरण",
  "National Infrastructure Land Acquisition Dossiers": "राष्ट्रीय अवसंरचना भूमि अधिग्रहण डोजियर",
  "Live monitoring of projects, project stages, and budget utilization": "परियोजनाओं, परियोजना चरणों और बजट उपयोग की लाइव निगरानी",
  "Export MIS Report": "MIS रिपोर्ट निर्यात करें",
  "Open Spatial Map": "स्थानिक मानचित्र खोलें",
  "Project Code & Name": "परियोजना कोड और नाम",
  "Ministry & Agency": "मंत्रालय और एजेंसी",
  "Current Stage": "वर्तमान चरण",
  "Actions": "कार्रवाइयां",
  "Track": "ट्रैक",
  "Land Acquisition Project Monitoring": "भूमि अधिग्रहण परियोजना निगरानी",
  "Official Scrutiny Desk": "आधिकारिक जांच डेस्क",
  "GIS Map": "जीआईएस मानचित्र",
  "PFMS Payouts": "PFMS भुगतान",
  "Current Milestone": "वर्तमान मील का पत्थर",
  "Predictive Analytics (Est. Date)": "पूर्वानुमानित विश्लेषण (अनुमानित तिथि)",
  "Pending": "लंबित",
  "Expressway & Logistics Corridor": "एक्सप्रेसवे और लॉजिस्टिक्स कॉरिडोर",
  "Railway Freight Corridor": "रेलवे फ्रेट कॉरिडोर",
  "Irrigation & Dam Project": "सिंचाई और बांध परियोजना",
  "Government Project": "सरकारी परियोजना",
  "Public Private Partnership (PPP)": "सार्वजनिक निजी भागीदारी (PPP)",
  "Private Infrastructure": "निजी बुनियादी ढांचा",
  "Please specify the Ministry and Executing Agency.": "कृपया मंत्रालय और निष्पादन एजेंसी निर्दिष्ट करें।",
  "Acquisition Proposal Portal": "अधिग्रहण प्रस्ताव पोर्टल",
  "View Project Status": "परियोजना स्थिति देखें",
  "Public-Private Partnership (PPP)": "सार्वजनिक-निजी भागीदारी (PPP)",
  "Private Company Acquisition": "निजी कंपनी अधिग्रहण",
  "No consent required": "किसी सहमति की आवश्यकता नहीं",
  "Public Grievances & Petitions": "सार्वजनिक शिकायतें और याचिकाएं",
  "Stage 3 Marked as Completed!": "चरण 3 पूर्ण के रूप में चिह्नित!",
  "Schedule II & III RFCTLARR Resettlement Scheme": "अनुसूची II और III RFCTLARR पुनर्वास योजना",
  "Monitoring displaced families, housing site allotments, annuity allowances, and skill development": "विस्थापित परिवारों, आवास स्थल आवंटन, वार्षिकी भत्ते और कौशल विकास की निगरानी करना",
  "Total Displaced Families": "कुल विस्थापित परिवार",
  "Resettlement Colony Housing Allotments": "पुनर्वास कॉलोनी आवास आवंटन",
  "One-Time Resettlement Allowance": "एकमुश्त पुनर्वास भत्ता",
  "Cash in lieu of employment option": "रोजगार विकल्प के बदले नकद",
  "Skill Development & Vocational Training": "कौशल विकास और व्यावसायिक प्रशिक्षण",
  "PMKVY Skill Certification Linkage": "PMKVY कौशल प्रमाणन लिंकेज",
  "Family Head Name": "परिवार के मुखिया का नाम",
  "Social Category": "सामाजिक श्रेणी",
  "Family Size": "परिवार का आकार",
  "Housing Site Allotment": "आवास स्थल आवंटन",
  "Package Value": "पैकेज मूल्य",
  "R&R Status": "आर एंड आर स्थिति",
  "Official Scrutiny Remarks are mandatory when returning for re-scrutiny or rejecting.": "पुनः जांच के लिए वापस करते समय या अस्वीकार करते समय आधिकारिक जांच टिप्पणियां अनिवार्य हैं।",
  "Official Approvals & Scrutiny Desk": "आधिकारिक अनुमोदन और जांच डेस्क",
  "Active Milestone Status": "सक्रिय मील का पत्थर स्थिति",
  "Your role does not perform step approvals.": "आपकी भूमिका चरण अनुमोदन नहीं करती है।",
  "Log in as District Collector, State Govt, SLAO, PFMS Officer, or R&R Commissioner to execute scrutiny decisions.": "जांच निर्णयों को निष्पादित करने के लिए जिला कलेक्टर, राज्य सरकार, SLAO, PFMS अधिकारी, या R&R आयुक्त के रूप में लॉग লগइन करें।",
  "Sequential Prerequisite Milestone Pending": "अनुक्रमिक पूर्वापेक्षा मील का पत्थर लंबित",
  "Official Decision Console": "आधिकारिक निर्णय कंसोल",
  "Return to Proposer for Re-Scrutiny": "पुनः जांच के लिए प्रस्तावक को लौटाएं",
  "RFCTLARR Act Statutory Acquisition Engine": "RFCTLARR अधिनियम वैधानिक अधिग्रहण इंजन",
  "GIS Hub": "जीआईएस हब",
  "Gazette Vault": "राजपत्र वॉल्ट",
  "Awaiting preceding stage": "पिछले चरण की प्रतीक्षा में",
  "Statutory Scrutiny Console": "वैधानिक जांच कंसोल",
  "Role View-Only Mode": "भूमिका केवल-दृश्य मोड",
  "Land Requiring Body": "भूमि अधिग्रहण निकाय",
  "NHAI / Railways / Ministry": "एनएचएआई / रेलवे / मंत्रालय",
  "District Collectorate": "जिला कलेक्ट्रेट",
  "District Acquisition Body": "जिला अधिग्रहण निकाय",
  "State Government": "राज्य सरकार",
  "State Revenue Department": "राज्य राजस्व विभाग",
  "Land Acquiring Officer": "भूमि अधिग्रहण अधिकारी",
  "SLAO Valuation Desk": "SLAO मूल्यांकन डेस्क",
  "PFMS Finance Officer": "PFMS वित्त अधिकारी",
  "Financial Treasury Desk": "वित्तीय ट्रेजरी डेस्क",
  "Rehabilitation Office": "पुनर्वास कार्यालय",
  "Cadastral Surveyor": "कैडस्ट्राल सर्वेक्षक",
  "Affected Landowner": "प्रभावित भूस्वामी",
  "Public Citizen Portal": "सार्वजनिक नागरिक पोर्टल",

  'en': {
    'BHOOMI SETU': 'BHOOMI SETU',
    'National Land Acquisition Portal': 'National Land Acquisition Portal',
    'Sign In': 'Sign In',
    'Select Stakeholder Role': 'Select Stakeholder Role',
    'Email': 'Email',
    'Password': 'Password',
    'Light Mode': 'Light Mode',
    'Dark Mode': 'Dark Mode',
    'Hindi': 'हिन्दी',
    'English': 'English',
    'Approvals & Scrutiny': 'Approvals & Scrutiny',
    'Mobile Field Survey': 'Mobile Field Survey',
    'PFMS Compensation': 'PFMS Compensation',
    'Rehabilitation & Resettlement': 'Rehabilitation & Resettlement',
    'National Dashboard': 'National Dashboard',
    'Mobile-Responsive Field Parcel Boundary Mapper': 'Mobile-Responsive Field Parcel Boundary Mapper',
    'Multi-Vertex Land Boundary Creator': 'Multi-Vertex Land Boundary Creator',
    'Plot non-square parcel boundaries, capture live vertex GPS points, and render closed GIS polygons': 'Plot non-square parcel boundaries, capture live vertex GPS points, and render closed GIS polygons',
    'Boundary Mapper': 'Boundary Mapper',
    'Field Inspection (LARR)': 'Field Inspection (LARR)',
    'Are you sure you want to mark all field surveys as completed? This will forward the project to Stage 6.': 'Are you sure you want to mark all field surveys as completed? This will forward the project to Stage 6.',
    'Stage 5 Cadastral Survey Marked as Completed!': 'Stage 5 Cadastral Survey Marked as Completed!',
    'Complete Stage 5 (Cadastral Survey)': 'Complete Stage 5 (Cadastral Survey)',
    'Dashboard': 'Dashboard',
    'Project Status': 'Project Status',
    'Public Grievances': 'Public Grievances',
    'Submit Proposal': 'Submit Proposal',
    'GIS Spatial Hub': 'GIS Spatial Hub',
    'R&R Entitlements': 'R&R Entitlements',
    'Landowner Portal': 'Landowner Portal',
    'Document Vault': 'Document Vault',
    'Sign Out': 'Sign Out',
    'Citizen Portal': 'Citizen Portal',
    'Proposal Submission': 'Proposal Submission',
    'GIS Spatial Viewer': 'GIS Spatial Viewer',
    'Workflow Lifecycle': 'Workflow Lifecycle',
    'Notifications': 'Notifications',
    'Active': 'Active'
  },
  'hi': {
    'BHOOMI SETU': 'भूमि सेतु',
    'National Land Acquisition Portal': 'राष्ट्रीय भूमि अधिग्रहण पोर्टल',
    'Sign In': 'साइन इन करें',
    'Authenticating...': 'प्रमाणीकरण हो रहा है...',
    'Select Stakeholder Role': 'हितधारक भूमिका चुनें',
    'Email': 'ईमेल',
    'Password': 'पासवर्ड',
    'Light Mode': 'लाइट मोड',
    'Dark Mode': 'डार्क मोड',
    'Hindi': 'हिन्दी',
    'English': 'English',
    'Approvals & Scrutiny': 'अनुमोदन और जांच',
    'Mobile Field Survey': 'मोबाइल फील्ड सर्वेक्षण',
    'PFMS Compensation': 'पीएमएस मुआवजा (PFMS)',
    'Rehabilitation & Resettlement': 'पुनर्वास और व्यवस्थापन',
    'National Dashboard': 'राष्ट्रीय डैशबोर्ड',
    'Mobile-Responsive Field Parcel Boundary Mapper': 'मोबाइल फील्ड पार्सल सीमा मैपर',
    'Multi-Vertex Land Boundary Creator': 'बहु-शीर्ष भूमि सीमा निर्माता',
    'Plot non-square parcel boundaries, capture live vertex GPS points, and render closed GIS polygons': 'गैर-वर्ग पार्सल सीमाओं को प्लॉट करें, लाइव जीपीएस बिंदु कैप्चर करें और जीआईएस पॉलीगॉन बनाएं',
    'Boundary Mapper': 'सीमा मैपर',
    'Field Inspection (LARR)': 'क्षेत्र निरीक्षण (एलएआरआर)',
    'Are you sure you want to mark all field surveys as completed? This will forward the project to Stage 6.': 'क्या आप सुनिश्चित हैं कि आप सभी क्षेत्र सर्वेक्षणों को पूरा के रूप में चिह्नित करना चाहते हैं? यह परियोजना को चरण 6 में आगे बढ़ा देगा।',
    'Stage 5 Cadastral Survey Marked as Completed!': 'चरण 5 कैडस्ट्राल सर्वेक्षण पूरा के रूप में चिह्नित किया गया!',
    'Complete Stage 5 (Cadastral Survey)': 'चरण 5 पूरा करें (कैडस्ट्राल सर्वेक्षण)',
    'Dashboard': 'डैशबोर्ड',
    'Project Status': 'परियोजना स्थिति',
    'Public Grievances': 'सार्वजनिक शिकायतें',
    'Submit Proposal': 'प्रस्ताव प्रस्तुत करें',
    'GIS Spatial Hub': 'जीआईएस स्थानिक हब',
    'GIS & Field Survey Map': 'जीआईएस और क्षेत्र सर्वेक्षण मानचित्र',
    'R&R Entitlements': 'R&R अधिकार',
    'Landowner Portal': 'जमींदार पोर्टल',
    'Document Vault': 'दस्तावेज़ तिजोरी',
    'Sign Out': 'साइन आउट करें',
    'Citizen Portal': 'नागरिक पोर्टल',
    'Proposal Submission': 'प्रस्ताव प्रस्तुतीकरण',
    'GIS Spatial Viewer': 'जीआईएस स्थानिक दर्शक',
    'Workflow Lifecycle': 'कार्यप्रवाह जीवनचक्र',
    'Notifications': 'सूचनाएं',
    'Active': 'सक्रिय',
    'National Land Acquisition Dashboard': 'राष्ट्रीय भूमि अधिग्रहण डैशबोर्ड',
    'All Infrastructure Projects': 'सभी बुनियादी ढांचा परियोजनाएं',
    'Total Project Area Acquired': 'कुल अधिग्रहित परियोजना क्षेत्र',
    'Total Compensation Disbursed': 'कुल मुआवजा वितरित',
    'Total Affected Families Rehabilitated': 'कुल प्रभावित परिवारों का पुनर्वास किया गया',
    'Land Acquisition by Project': 'परियोजना के अनुसार भूमि अधिग्रहण',
    'Compensation vs Land Value': 'मुआवजा बनाम भूमि मूल्य',
    'Calculated Polygon Area (Ha):': 'गिना हुआ बहुभुज क्षेत्रफल (हेक्टेयर):',
    '-- Choose Parcel --': '-- पार्सल चुनें --',
    'Custom Lat:': 'कस्टम अक्षांश (Lat):',
    'Custom Lng:': 'कस्टम देशांतर (Lng):',
    'Infrastructure Project Corridor:': 'बुनियादी ढांचा परियोजना गलियारा:',
    'Khata Number:': 'खाता संख्या:',
    'Land Category:': 'भूमि श्रेणी:',
    'Owner Contact Phone:': 'मालिक का संपर्क फोन:',
    'Primary Landowner Name:': 'प्राथमिक जमींदार का नाम:',
    'Property / Land Address:': 'संपत्ति / भूमि का पता:',
    'Structures (Houses/Wells)': 'संरचनाएँ (मकान/कुएं)',
    'Survey Number:': 'सर्वेक्षण संख्या:',
    'Village / Settlement:': 'गांव / बस्ती:',
    'ReadOnly Access Mode': 'केवल पढ़ने के लिए मोड',
    'Custom Point': 'कस्टम पॉइंट',
    'Accuracy:': 'सटीकता:',
    'Regional IP Gateway': 'क्षेत्रीय आईपी गेटवे',
    'GPS Location': 'जीपीएस स्थान',
    'Drag pin anywhere on map to micro-adjust': 'सूक्ष्म-समायोजन के लिए मानचित्र पर कहीं भी पिन खींचें',
    'As you add or remove vertex coordinates on the left panel, the green polygon boundary updates live on the map above.': 'जैसे-जैसे आप बाएं पैनल पर वर्टेक्स निर्देशांक जोड़ते या हटाते हैं, ऊपर मानचित्र पर हरा बहुभुज सीमा लाइव अपडेट होता है।',
    'Boundary Vertices': 'सीमा वर्टिस',
    'Vertices Connected:': 'वर्टिस जुड़े:',
    'Vertex': 'वर्टेक्स',
    'Submit LARR Inspection Report': 'LARR निरीक्षण रिपोर्ट सबमिट करें',
    'Map Custom Multi-Vertex Land Boundary': 'कस्टम मल्टी-वर्टेक्स भूमि सीमा का मानचित्रण करें',
    'Map & GPS Actions': 'मानचित्र और जीपीएस क्रियाएँ'
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('PROJ-KBIL-003');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectRefreshCount, setProjectRefreshCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('bhoomi_theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('bhoomi_lang') || 'en');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    }
    localStorage.setItem('bhoomi_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bhoomi_lang', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key) => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    return key;
  };

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifs = async () => {
      const roleKey = user ? user.role.id : 'ALL';
      const fetched = await fetchNotifications(roleKey);
      
      const mapped = fetched.map(n => {
        const d = new Date(n.created_at);
        let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: n.id,
          text: n.text,
          time: timeStr,
          unread: n.unread === 1 || n.unread === true
        };
      });
      setNotifications(mapped);
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    setActiveTab(userData.role.defaultTab);
  };

  const logout = () => {
    setUser(null);
  };

  const notifyProjectUpdated = () => {
    setProjectRefreshCount(prev => prev + 1);
  };

  const addNotification = async (text, targetRole = 'ALL') => {
    try {
      await createNotification(text, targetRole);
      const newNotif = {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err) {
      console.error('Failed to create notification', err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      const roleKey = user ? user.role.id : 'ALL';
      await markAllNotificationsRead(roleKey);
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const activeRole = user ? user.role : ROLES.CITIZEN;

  const isTabAllowed = (tabId) => {
    if (!user) return false;
    return user.role.allowedTabs.includes(tabId);
  };

  const isStepAuthorized = (stepNum) => {
    if (!user) return false;
    return user.role.authorizedSteps.includes(stepNum);
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeRole,
      isAuthenticated: !!user,
      login,
      logout,
      selectedProjectId,
      setSelectedProjectId,
      activeTab,
      setActiveTab,
      notifications,
      addNotification,
      markNotificationsRead,
      isTabAllowed,
      isStepAuthorized,
      projectRefreshCount,
      notifyProjectUpdated,
      theme,
      toggleTheme,
      language,
      toggleLanguage,
      t
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
