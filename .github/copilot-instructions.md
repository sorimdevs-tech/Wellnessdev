# Wellness Healthcare Platform - AI Coding Instructions

## Architecture Overview

**Stack**: Full-stack healthcare management system with a React + TypeScript + Tailwind frontend and FastAPI + MongoDB backend.

### Frontend Structure (`clinical-frontend/`)
- **Vite + React 19** with TypeScript for fast HMR development
- **Pages**: Login, Register, UserDashboard, DoctorDashboard, AppointmentsPage, BrowseHospitalsPage, MedicalRecordsPage, ProfilePage, SettingsPage
- **Context API** (UserContext, AppointmentContext) for state management
- **API Layer** (`src/services/api.ts`): Centralized fetch wrapper that auto-attaches Bearer tokens from localStorage
- **Component Organization**: Reusable components (Header, Footer, HospitalCard, BookingModal, SessionManager, NotificationsPanel, Filters)

### Backend Structure (`clinical-backend/`)
- **FastAPI** with async/await using Motor (async MongoDB driver)
- **Route Organization**: Each domain (auth, users, hospitals, doctors, appointments, medical_records, settings) has its own router module in `routes/`
- **Authentication**: JWT-based with `get_current_user()` dependency injection in routes
- **Database**: MongoDB with dynamic schema via Pydantic models in `schemas.py`
- **CORS**: Configured for localhost:5173, :3000, and wildcard (*) in production

## Critical Data Flows

### Authentication Flow
1. User registers/logs in via POST `/auth/register` or `/auth/login`
2. Backend returns `TokenResponse` (access_token, token_type, user object)
3. Frontend stores token in localStorage and sets in UserContext
4. Subsequent requests include `Authorization: Bearer {token}` header (auto-added by `api.ts` fetchAPI wrapper)
5. Backend validates token via `get_current_user()` middleware using `decode_token()` from `auth.py`

### Appointment Booking
- Frontend: `BookingModal.tsx` collects doctor_id, hospital_id, appointment date/time
- POST to `/appointments/` requires valid Bearer token (enforced via `current_user` dependency)
- Backend validates doctor and hospital exist before creating appointment
- Frontend reflects booking status in AppointmentContext and UI

### Role Switching
- Users can have dual roles (patient/doctor) via `currentRole` field in User schema
- POST `/auth/switch-role` toggles between "user" and "doctor"
- Frontend manages role state in UserContext for conditional page routing

## Development Workflows

### Starting the Application
**Frontend** (Vite dev server, no manual start needed if already running):
```bash
cd clinical-frontend
npm install  # if needed
npm run dev  # runs on http://localhost:5174
```

**Backend** (requires Python + MongoDB):
```bash
cd clinical-backend
pip install -r requirements.txt
# Ensure MongoDB is running locally or update .env with MongoDB Atlas connection
python main.py  # runs on http://localhost:8000
```

**Testing with Mock Data**: Use demo accounts in SETUP_GUIDE.md (mobile: 9876543210, OTP: 123456)

### Building
Frontend: `npm run build` → `npm run preview` (TypeScript → Vite bundle)
Backend: Use FastAPI's built-in Swagger UI at http://localhost:8000/docs to test endpoints

## Project-Specific Patterns & Conventions

### Frontend
- **API Calls**: Always use `fetchAPI<T>()` from `api.ts` (handles auth headers, error logging)
- **State Management**: Context API only; UserContext holds user + session; AppointmentContext holds appointments
- **Styling**: Tailwind CSS (no component libraries); check `tailwind.config.js` for custom theme
- **Protected Routes**: Wrap with `ProtectedRoute` component (checks `useUser()` hook for authentication)

### Backend
- **Schema Validation**: All POST/PUT requests use Pydantic models from `schemas.py` (e.g., `UserCreate`, `AppointmentCreate`)
- **MongoDB ObjectId Handling**: Convert string IDs from frontend to `ObjectId()` in routes; convert back to `str()` in responses
- **Async Operations**: All database calls are async via Motor; use `await db.collection.find_one()`, `insert_one()`, etc.
- **Error Handling**: Raise `HTTPException` with appropriate status codes (401 for auth, 404 for not found, 422 for validation)

### Configuration
- **Environment Variables**: Use `.env` file (loaded via `BaseSettings` in `config.py`); includes `mongodb_url`, `secret_key`, `algorithm`, `access_token_expire_minutes`
- **CORS**: Configured in `main.py` middleware; update `allow_origins` if adding new frontend ports

## Key Files by Task

| Task | Key Files |
|------|-----------|
| Add new API endpoint | `clinical-backend/routes/{domain}.py`, `schemas.py` |
| Add new frontend page | `clinical-frontend/src/pages/{Page}.tsx`, update `App.tsx` routing |
| Modify authentication | `clinical-backend/auth.py`, `clinical-backend/routes/auth.py`, `clinical-frontend/src/context/UserContext.tsx` |
| Add database collection | Update `schemas.py` with Pydantic model; add route in `clinical-backend/routes/` |
| Styling updates | `clinical-frontend/tailwind.config.js`, component `.tsx` files |

## Common Integration Points

- **Auth Token Exchange**: Frontend ↔ Backend via Authorization header
- **Appointment Booking**: UserContext → api.ts → Backend validation → MongoDB
- **Role Switching**: UserContext → API call → Backend token update → Frontend re-renders with new role
- **Session Management**: SessionManager component monitors inactivity; logout clears localStorage and UserContext

## Debugging Tips

- **Frontend errors**: Check browser DevTools; API layer logs errors to console
- **Backend errors**: Swagger UI (/docs) shows live endpoint testing; check console for MongoDB connection issues
- **Auth failures**: Verify token exists in localStorage; check expiration in `decode_token()` logic
- **CORS issues**: Update `allow_origins` in `main.py` if testing with new frontend port
