# 🗺️ Church Planting Map

> A comprehensive platform for tracking and visualizing church planting progress across villages and people groups.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4+-black.svg)](https://socket.io/)

---

## ✨ Features

- **Interactive Maps** - Leaflet-based maps with 10,671+ village polygons
- **Real-Time Updates** - Socket.IO for live dashboard and map updates
- **DMM Status Tracking** - Track Disciple Making Movement progress
- **Role-Based Access** - Admin, Supervisor, Missionary, Guest roles
- **CSV Import** - Bulk import people groups from CSV files
- **Multi-Language** - Full French/English support
- **Voronoi Diagrams** - Coverage analysis and gap identification

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd church-planting-map

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Run startup checklist
node scripts/startupChecklist.js

# Start development servers
npm run dev          # Backend on port 5000
cd frontend && npm run dev  # Frontend on port 5173
```

### Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/church-planting-map
JWT_SECRET=your-super-secret-key-change-in-production

# Optional
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 📁 Project Structure

```
church-planting-map/
├── server.js              # Express server with Socket.IO
├── models/                # Mongoose models
│   ├── User.js
│   ├── Village.js
│   ├── PeopleGroup.js
│   └── ...
├── routes/                # API routes
│   ├── auth.js
│   ├── villages.js
│   ├── peopleGroups.js
│   └── ...
├── middleware/            # Express middleware
│   ├── auth.js
│   └── roles.js
├── services/              # Business logic
│   └── villageStatusService.js
├── scripts/               # Utility scripts
│   ├── grantAdminRole.js
│   ├── importPeopleGroupsFromCSV.js
│   ├── verifyDatabase.js
│   └── startupChecklist.js
├── data/                  # GeoJSON data files
│   └── cameroon_villages.geojson
├── frontend/              # React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── i18n/
│   └── package.json
└── uploads/               # Uploaded files
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get current user |

### Villages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/villages` | List all villages |
| GET | `/api/villages/statuses` | Get village status calculations |
| GET | `/api/villages/:id` | Get village by ID |

### People Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/people-groups` | List all people groups |
| POST | `/api/people-groups` | Create people group |
| POST | `/api/people-groups/:id/approve` | Approve (admin/supervisor) |

See [FEATURES.md](FEATURES.md) for complete API documentation.

## 🎨 Village Status Colors

Villages are color-coded based on DMM engagement:

| Status | Color | Threshold |
|--------|-------|-----------|
| 🟢 DMM | Green (#22c55e) | ≥30% DMM |
| 🟠 Tipping Point | Orange (#f97316) | ≥40% Tipping Point |
| 🔵 Midway | Blue (#3b82f6) | ≥50% Midway |
| 🟡 Pioneer | Yellow (#eab308) | ≥70% Pioneer |
| ⚪ Unreached | Gray (#9ca3af) | No threshold met |

## 🛠️ Utility Scripts

```bash
# Grant admin role to a user
node scripts/grantAdminRole.js user@example.com

# Import people groups from CSV
node scripts/importPeopleGroupsFromCSV.js data/people-groups.csv

# Verify database integrity
node scripts/verifyDatabase.js

# Run startup checklist
node scripts/startupChecklist.js

# Test village color calculations
node scripts/testVillageColors.js
```

## 📚 Documentation

- [FEATURES.md](FEATURES.md) - Complete feature documentation
- [TESTING.md](TESTING.md) - Testing guide and troubleshooting
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md) - Configuration options

## 🧪 Testing

```bash
# Run startup checklist
node scripts/startupChecklist.js

# Verify database
node scripts/verifyDatabase.js

# Test village status calculations
node scripts/testVillageColors.js

# Check API health
curl http://localhost:5000/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License - see LICENSE file for details.

---

*Built with ❤️ for church planting movements worldwide* 🗺️⛪
