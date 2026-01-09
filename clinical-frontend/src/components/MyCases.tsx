import { useAppointment } from "../context/AppointmentContext";
import { useUser } from "../context/UserContext";

export default function MyCases() {
  const { appointments } = useAppointment();
  const { user } = useUser();
  if (!user || user.currentRole !== "doctor") return null;

  // Get unique patients who had appointments with this doctor
  const patients = Array.from(
    new Set(
      appointments
        .filter((apt) => apt.doctorId === user.id && apt.status === "completed")
        .map((apt) => apt.userName)
    )
  );

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">My Patients (Cases)</h2>
      {patients.length === 0 ? (
        <div className="text-gray-500">No patients yet.</div>
      ) : (
        <ul className="space-y-2">
          {patients.map((name, idx) => (
            <li key={idx} className="border-b pb-2 font-semibold">{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
