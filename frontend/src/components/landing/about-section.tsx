import Image from "next/image";

export function AboutSection() {
  return (
    <section className="overflow-hidden bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Animated logo assembly */}
        <div className="about-logo-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pin.svg"
            alt="Pin"
            className="about-pin"
          />
          <Image
            src="/map.png"
            alt="Map"
            width={560}
            height={400}
            className="about-map"
          />
        </div>

        {/* Description */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <h2 className="text-3xl font-black text-[var(--asphalt)] sm:text-4xl">
            Tentang CommunityMap
          </h2>
          <p className="mt-5 text-base leading-7 text-[var(--muted)]">
            <strong className="text-[var(--asphalt)]">CommunityMap</strong>{" "}
            adalah platform crowdsourcing yang menghubungkan warga dengan
            pemerintah daerah untuk melaporkan kondisi jalan bermasalah secara
            real-time. Melalui peta interaktif, setiap laporan divisualisasikan
            agar petugas dapat menentukan prioritas perbaikan dengan cepat dan
            akurat.
          </p>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Dengan teknologi GPS dan foto langsung dari lokasi, platform ini
            memastikan transparansi penanganan infrastruktur jalan. Warga bisa
            memantau status penanganan, memberi upvote laporan penting, dan
            membantu menciptakan lingkungan yang lebih aman untuk semua.
          </p>
        </div>
      </div>
    </section>
  );
}
