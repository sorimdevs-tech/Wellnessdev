interface FiltersProps {
  location: string;
  setLocation: (location: string) => void;
  distance: number;
  setDistance: (distance: string) => void;
}

export default function Filters({ location, setLocation, distance, setDistance }: FiltersProps) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-gray-200 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
      
      {/* Location */}
      <div className="flex-1">
        <label className="text-gray-700 font-semibold text-sm mb-1 block">Location</label>
        <input
          type="text"
          className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          placeholder="Enter city / area"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* Distance */}
      <div className="w-full md:w-48">
        <label className="text-gray-700 font-semibold text-sm mb-1 block">
          Distance (km)
        </label>
        <select
          className="w-full py-3 px-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        >
          <option value="2">Within 2 km</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="20">Within 20 km</option>
        </select>
      </div>
    </div>
  );
}
