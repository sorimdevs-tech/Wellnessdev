"""
FHIR Module
 
This package contains all integrations related to FHIR,
including proxy routes that communicate with external
FHIR servers like HAPI FHIR.
 
Imported and registered in the main FastAPI application.
"""
 
# Optional: expose router at package level (clean import)
from .fhir_proxy import router
 
__all__ = ["router"]
 