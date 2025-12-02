"use client";
import Image from "next/image";

const icons = [
  { src: "/halloween/dd35ec9d7b06fb5b899dae202642f0c0fd571d56.png", label: "Pumpkin" },
  { src: "/halloween/582a91c2fb2b5b691b31fb9c7cb55da7a016835a.png", label: "Eyes" },
  { src: "/halloween/3a907c0e594e74c8ee10d4f6af21989002f8fa42.png", label: "Pot" },
  { src: "/halloween/7d4225c4f794d7555b1acb3ea812c9291e1bc8c8.png", label: "Grave" },
  { src: "/halloween/c34b953113163593e06ba9ba0d9cbb972e8dc60e.png", label: "Bottles" },
  { src: "/halloween/9f22c947bc93d5b155f773e73bd7a35c67637810.png", label: "Spider" },
  { src: "/halloween/77a735da49034868d2c87d226185a35067275c8c.png", label: "Skull" },
  { src: "/halloween/2d5bb73a1c62efc4fda8a489001d6af2c1a55638.png", label: "Bats" },
  { src: "/halloween/4f576476763671db288511028d311c966a060b4e.png", label: "Ghost" },
];

export default function HalloweenIcons() {
  return (
    <div className="min-h-screen bg-[#080808] p-8 font-['DM_Sans']">
      <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
        {icons.map((icon) => (
          <div
            key={icon.label}
            className="bg-[rgba(31,31,31,0.4)] border border-[#444444] rounded-[56px] p-6 flex flex-col items-center"
          >
            <Image src={icon.src} alt={icon.label} width={120} height={120} className="object-contain" />
            <span className="text-white mt-3 text-sm">{icon.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
