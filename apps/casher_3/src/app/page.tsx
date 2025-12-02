import Image from "next/image";

const coffees = [
  { name: "Espresso", desc: "Classic Shot", rating: 4.9, img: "/images/coffee.svg" },
  { name: "Latte", desc: "Creamy Milk", rating: 4.8, img: "/images/coffee.svg" },
  { name: "Cappuccino", desc: "Foamy Top", rating: 4.7, img: "/images/coffee.svg" },
  { name: "Americano", desc: "Bold Flavor", rating: 4.6, img: "/images/coffee.svg" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f5] p-6">
      <h1 className="text-2xl font-bold text-[#3c2f2f] mb-6">Coffee Menu</h1>
      <div className="grid grid-cols-2 gap-4">
        {coffees.map((item) => (
          <div
            key={item.name}
            className="bg-white rounded-[20px] shadow-[0px_6px_17px_0px_rgba(0,0,0,0.13)] p-4 relative"
          >
            <div className="flex justify-center -mt-2 mb-3">
              <Image src={item.img} alt={item.name} width={80} height={80} />
            </div>
            <p className="font-semibold text-[#3c2f2f]">{item.name}</p>
            <p className="text-sm text-[#3c2f2f]">{item.desc}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[#ff9633]">★</span>
              <span className="text-sm text-[#3c2f2f]">{item.rating}</span>
            </div>
            <button className="absolute top-3 right-3 text-[#3c2f2f]">♡</button>
          </div>
        ))}
      </div>
    </main>
  );
}
