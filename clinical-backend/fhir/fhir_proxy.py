from fastapi import APIRouter, Request
from typing import Optional
import aiohttp
 
router = APIRouter(
    prefix="/fhir",
    tags=["FHIR Proxy"]
)
 
HAPI_BASE = "https://hapi.fhir.org/baseR4"
 
 
# --------------------- COMMON FETCH FUNCTION ---------------------
async def fetch_hapi_data(endpoint: str, params: dict = None):
    url = f"{HAPI_BASE}/{endpoint}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params or {}) as response:
            if response.status == 200:
                return await response.json()
 
            return {
                "resourceType": "OperationOutcome",
                "issue": [
                    {
                        "severity": "error",
                        "code": "not-found",
                        "details": {"text": "Resource not found"}
                    }
                ]
            }
 
 
# --------------------- ROOT ---------------------
@router.get("/")
async def fhir_root():
    return {
        "message": "🚀 HAPI FHIR Proxy Integrated",
        "source": HAPI_BASE,
        "examples": {
            "patients": "/fhir/Patient?name=john",
            "doctors": "/fhir/Practitioner",
            "appointments": "/fhir/Appointment",
            "observations": "/fhir/Observation"
        }
    }
 
 
# --------------------- PATIENT & IDENTITY ---------------------
@router.get("/Patient")
async def get_patients(
    name: Optional[str] = None,
    gender: Optional[str] = None,
    _count: int = 20
):
    params = {"_count": _count}
    if name:
        params["name"] = name
    if gender:
        params["gender"] = gender
    return await fetch_hapi_data("Patient", params)
 
 
@router.get("/Person")
async def get_person(name: Optional[str] = None):
    params = {"name": name} if name else {}
    return await fetch_hapi_data("Person", params)
 
 
@router.get("/Practitioner")
async def get_practitioner(specialty: Optional[str] = None):
    params = {"specialty": specialty} if specialty else {}
    return await fetch_hapi_data("Practitioner", params)
 
 
@router.get("/PractitionerRole")
async def get_practitioner_role():
    return await fetch_hapi_data("PractitionerRole")
 
 
@router.get("/RelatedPerson")
async def get_related_person():
    return await fetch_hapi_data("RelatedPerson")
 
 
@router.get("/Group")
async def get_group():
    return await fetch_hapi_data("Group")
 
 
# --------------------- ENCOUNTERS & SCHEDULING ---------------------
@router.get("/Encounter")
async def get_encounter():
    return await fetch_hapi_data("Encounter")
 
 
@router.get("/EpisodeOfCare")
async def get_episode_of_care():
    return await fetch_hapi_data("EpisodeOfCare")
 
 
@router.get("/Appointment")
async def get_appointment(patient: Optional[str] = None):
    params = {"patient": patient} if patient else {}
    return await fetch_hapi_data("Appointment", params)
 
 
@router.get("/AppointmentResponse")
async def get_appointment_response():
    return await fetch_hapi_data("AppointmentResponse")
 
 
@router.get("/Schedule")
async def get_schedule():
    return await fetch_hapi_data("Schedule")
 
 
@router.get("/Slot")
async def get_slot():
    return await fetch_hapi_data("Slot")
 
 
@router.get("/Task")
async def get_task():
    return await fetch_hapi_data("Task")
 
 
@router.get("/ServiceRequest")
async def get_service_request():
    return await fetch_hapi_data("ServiceRequest")
 
 
# --------------------- CLINICAL DATA ---------------------
@router.get("/Condition")
async def get_condition(patient: Optional[str] = None):
    params = {"patient": patient} if patient else {}
    return await fetch_hapi_data("Condition", params)
 
 
@router.get("/Procedure")
async def get_procedure():
    return await fetch_hapi_data("Procedure")
 
 
@router.get("/Observation")
async def get_observation(
    patient: Optional[str] = None,
    code: Optional[str] = None
):
    params = {}
    if patient:
        params["patient"] = patient
    if code:
        params["code"] = code
    return await fetch_hapi_data("Observation", params)
 
 
@router.get("/DiagnosticReport")
async def get_diagnostic_report():
    return await fetch_hapi_data("DiagnosticReport")
 
 
# --------------------- ORGANIZATION & LOCATION ---------------------
@router.get("/Organization")
async def get_organization():
    return await fetch_hapi_data("Organization")
 
 
@router.get("/Location")
async def get_location():
    return await fetch_hapi_data("Location")
 
 
@router.get("/HealthcareService")
async def get_healthcare_service():
    return await fetch_hapi_data("HealthcareService")
 
 
# --------------------- MEDICATION ---------------------
@router.get("/Medication")
async def get_medication():
    return await fetch_hapi_data("Medication")
 
 
@router.get("/MedicationRequest")
async def get_medication_request(patient: Optional[str] = None):
    params = {"patient": patient} if patient else {}
    return await fetch_hapi_data("MedicationRequest", params)
 
 
# --------------------- CMS / DASHBOARD ---------------------
@router.get("/cms/dashboard")
async def cms_dashboard():
    patients = await fetch_hapi_data("Patient?_count=1")
    practitioners = await fetch_hapi_data("Practitioner?_count=1")
    appointments = await fetch_hapi_data("Appointment?_count=1")
 
    return {
        "source": "LIVE HAPI FHIR DATA",
        "total_patients": patients.get("total", 0),
        "total_practitioners": practitioners.get("total", 0),
        "total_appointments": appointments.get("total", 0),
        "base_url": HAPI_BASE
    }
 
 
# --------------------- METADATA ---------------------
@router.get("/metadata")
async def metadata():
    return await fetch_hapi_data("metadata")
 
 
@router.get("/CapabilityStatement")
async def capability_statement():
    return await fetch_hapi_data("metadata")
 
 
# --------------------- UNIVERSAL SEARCH ---------------------
@router.get("/search")
async def universal_search(query: str):
    patients = await fetch_hapi_data("Patient", {"name:contains": query})
    practitioners = await fetch_hapi_data("Practitioner", {"name:contains": query})
 
    return {
        "resourceType": "Bundle",
        "query": query,
        "patients": patients.get("entry", []),
        "practitioners": practitioners.get("entry", [])
    }
 