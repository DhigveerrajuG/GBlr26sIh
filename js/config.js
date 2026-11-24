/**
 * config.js - Global Configuration for SIH Support Desk
 */

window.SIH_CONFIG = {
  API_BASE: '',
  COOLDOWN_SECONDS: 300, // 5 minutes cooldown between requests
  POLL_INTERVAL_MS: 10000,

  VENUES: [
    'Main Arena — Hall A',
    'Main Arena — Hall B',
    'Main Arena — Hall C',
    'Hardware Lab 104',
    'Hardware Lab 105',
    'Main Stage',
    'Workshop Area'
  ],

  CATEGORIES: [
    'Wi-Fi & Network',
    'Power Socket / Extension Box',
    'Hardware & Components',
    'Software / Tooling / Environment',
    'Mentor Assistance',
    'Food / Water / Cleanliness',
    'General Query'
  ],

  // Registered Table-to-Team, Leader & Venue mapping for instant autofill
  KNOWN_TEAMS: {
    "1": { teamName: "CyberSentinels", leaderName: "Aarav Sharma", venue: "Main Arena — Hall A" },
    "2": { teamName: "ByteForce", leaderName: "Priya Patel", venue: "Main Arena — Hall A" },
    "3": { teamName: "VisionAI", leaderName: "Rohan Verma", venue: "Main Arena — Hall A" },
    "4": { teamName: "CloudPioneers", leaderName: "Sneha Reddy", venue: "Main Arena — Hall A" },
    "5": { teamName: "AlgoRhythm", leaderName: "Vikram Malhotra", venue: "Main Arena — Hall A" },
    "6": { teamName: "DataDynamos", leaderName: "Ananya Iyer", venue: "Main Arena — Hall A" },
    "7": { teamName: "PixelCrafters", leaderName: "Kabir Mehta", venue: "Main Arena — Hall A" },
    "8": { teamName: "EcoVanguard", leaderName: "Diya Nair", venue: "Hardware Lab 104" },
    "9": { teamName: "RoboTech", leaderName: "Aditya Joshi", venue: "Hardware Lab 104" },
    "10": { teamName: "CircuitBreakers", leaderName: "Pooja Hegde", venue: "Hardware Lab 104" },
    "11": { teamName: "SensorStack", leaderName: "Karthik Rao", venue: "Hardware Lab 104" },
    "12": { teamName: "EmbeddedPulse", leaderName: "Meera Sen", venue: "Hardware Lab 105" },
    "13": { teamName: "MicroMinds", leaderName: "Arjun Das", venue: "Hardware Lab 105" },
    "14": { teamName: "CodeCrafters", leaderName: "Rohan Gupta", venue: "Main Arena — Hall A" },
    "15": { teamName: "DevDynasty", leaderName: "Neha Kapoor", venue: "Main Arena — Hall B" },
    "16": { teamName: "BinaryBeasts", leaderName: "Siddharth Jain", venue: "Main Arena — Hall B" },
    "17": { teamName: "LogicLords", leaderName: "Tanvi Saxena", venue: "Main Arena — Hall B" },
    "18": { teamName: "TechTitans", leaderName: "Varun Bhat", venue: "Main Arena — Hall B" },
    "19": { teamName: "StackMasters", leaderName: "Ishita Roy", venue: "Main Arena — Hall B" },
    "20": { teamName: "SiliconWizards", leaderName: "Manish Tiwari", venue: "Hardware Lab 105" },
    "21": { teamName: "AutoBots", leaderName: "Ritika Ghosh", venue: "Hardware Lab 105" },
    "22": { teamName: "SmartGrid AI", leaderName: "Gaurav Kulkarni", venue: "Main Arena — Hall A" },
    "23": { teamName: "AgriSense", leaderName: "Divya Pillai", venue: "Workshop Area" },
    "24": { teamName: "DroneVision", leaderName: "Abhishek Bose", venue: "Workshop Area" },
    "25": { teamName: "GreenPulse", leaderName: "Kavya Menon", venue: "Main Stage" },
    "26": { teamName: "MedTech AI", leaderName: "Sanjay Singhania", venue: "Main Arena — Hall B" },
    "27": { teamName: "HealthSync", leaderName: "Preeti Desai", venue: "Main Arena — Hall B" },
    "28": { teamName: "AeroDrones", leaderName: "Nikhil Chawla", venue: "Workshop Area" },
    "29": { teamName: "SmartCity Labs", leaderName: "Swati Agarwal", venue: "Main Stage" },
    "30": { teamName: "DataVanguard", leaderName: "Harsh Vardhan", venue: "Main Arena — Hall B" },
    "31": { teamName: "FinTech Pioneers", leaderName: "Deepak Choudhury", venue: "Main Arena — Hall B" },
    "32": { teamName: "NeuralByte", leaderName: "Anushka Pandey", venue: "Main Arena — Hall B" },
    "33": { teamName: "DeepLearners", leaderName: "Rahul Mittal", venue: "Main Arena — Hall B" },
    "34": { teamName: "BioInformatics", leaderName: "Shreya Mukherjee", venue: "Main Arena — Hall C" },
    "35": { teamName: "AgriTech Innovators", leaderName: "Kunal Bansal", venue: "Workshop Area" },
    "36": { teamName: "SolarGrid", leaderName: "Pooja Kulkarni", venue: "Workshop Area" },
    "37": { teamName: "CleanEnergy", leaderName: "Rajesh Kannan", venue: "Workshop Area" },
    "38": { teamName: "QuantumBit", leaderName: "Alok Nanda", venue: "Main Arena — Hall C" },
    "39": { teamName: "CyberShield", leaderName: "Simran Kaur", venue: "Main Arena — Hall C" },
    "40": { teamName: "ZeroDay Hunters", leaderName: "Mohit Suri", venue: "Main Arena — Hall C" },
    "41": { teamName: "BlockChain Titans", leaderName: "Ritu Chauhan", venue: "Main Arena — Hall C" },
    "42": { teamName: "Web3 Pioneers", leaderName: "Naveen Prasad", venue: "Main Arena — Hall C" },
    "43": { teamName: "NeuroNet", leaderName: "Gayatri Krishnan", venue: "Main Arena — Hall C" },
    "44": { teamName: "AI Vanguard", leaderName: "Vivek Anand", venue: "Main Arena — Hall C" },
    "45": { teamName: "NexGen Coders", leaderName: "Suresh Raina", venue: "Main Arena — Hall C" },
    "46": { teamName: "CloudArchitects", leaderName: "Kiran Bedi", venue: "Main Arena — Hall C" },
    "47": { teamName: "EdgeCompute", leaderName: "Tarun Bajaj", venue: "Hardware Lab 105" },
    "48": { teamName: "ChipMasters", leaderName: "Bhavna Sethi", venue: "Hardware Lab 104" },
    "49": { teamName: "IoT Nexus", leaderName: "Sameer Varma", venue: "Hardware Lab 104" },
    "50": { teamName: "RoboWarriors", leaderName: "Pranav Mohan", venue: "Hardware Lab 105" },
    "51": { teamName: "QuantumLeap", leaderName: "Aakash Chopra", venue: "Main Arena — Hall C" },
    "99": { teamName: "AutomatedTestTeam", leaderName: "Alex Mercer", venue: "Hardware Lab 104" }
  },

  STORAGE_KEYS: {
    DEVICE_ID: 'sih_device_uuid',
    SAVED_TEAM: 'sih_participant_team',
    SAVED_TABLE: 'sih_participant_table',
    SAVED_LEADER: 'sih_participant_leader',
    SAVED_VENUE: 'sih_participant_venue',
    ACTIVE_TICKET: 'sih_active_ticket_id',
    COOLDOWN_UNTIL: 'sih_cooldown_until',
    AUTH_TOKEN: 'sih_auth_token',
    AUTH_USER: 'sih_auth_user',
    THEME: 'sih_theme_mode',
    SOUND_ENABLED: 'sih_sound_enabled'
  },

  ROLES: {
    SUPERADMIN: 'superadmin',
    VOLUNTEER: 'volunteer',
    MENTOR: 'mentor'
  }
};
