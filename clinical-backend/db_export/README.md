# Database Export

This folder contains the MongoDB database export for the Wellness Healthcare Platform.

## Collections Exported

- `users` - User accounts (patients and doctors)
- `doctors` - Doctor profiles and information
- `hospitals` - Hospital listings
- `appointments` - Appointment records
- `medical_records` - Patient medical records metadata
- `notifications` - User notifications
- `chat_messages` - Chat history
- `doctor_verifications` - Doctor verification requests
- `background_verifications` - Background check records
- `specializations` - Medical specializations list
- `hospital_types` - Types of hospitals
- `settings` - User settings
- `otp` - OTP records for authentication
- `feedbacks` - User feedback

## How to Import

1. Make sure MongoDB is running locally on `mongodb://localhost:27017`
2. Navigate to the `clinical-backend` directory
3. Run the import script:

```bash
python import_db.py
```

4. Confirm when prompted

## How to Export (for updates)

To create a fresh export of your database:

```bash
python export_db.py
```

## Note

- The exported data includes ObjectIds in MongoDB extended JSON format
- Dates are stored in ISO format
- The import script will add documents to existing collections (won't overwrite)
