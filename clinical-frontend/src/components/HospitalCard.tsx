interface Hospital {
  id: number;
  name: string;
  distance: number;
  address: string;
  specialties: string[];
}

interface HospitalCardProps {
  hospital: Hospital;
}

export default function HospitalCard({ hospital }: HospitalCardProps) {
  return (
    <div className="p-5 bg-white rounded-2xl shadow-md hover:shadow-lg transition border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">{hospital.name}</h3>
        <span className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
          {hospital.distance} km
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-3">{hospital.address}</p>

      <div className="flex gap-2 flex-wrap">
        {hospital.specialties?.map((item: string, idx: number) => (
          <span
            key={idx}
            className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
