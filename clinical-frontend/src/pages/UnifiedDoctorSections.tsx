// Doctor-only dashboard sections for unified dashboard
import PendingRequests from "../components/PendingRequests";
import TodaysSchedule from "../components/TodaysSchedule";
import AvailabilityPanel from "../components/AvailabilityPanel";
import MyCases from "../components/MyCases";

export default function UnifiedDoctorSections() {
  return (
    <div className="mt-12">
      <PendingRequests />
      <TodaysSchedule />
      <AvailabilityPanel />
      <MyCases />
    </div>
  );
}
