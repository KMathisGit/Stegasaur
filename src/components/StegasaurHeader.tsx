function StegasaurHeader() {
  return (
    <h1 className="font-pixilify h-24 flex items-center justify-center uppercase font-semibold tracking-wide header-text-shadow">
      {"Stegasaur".split("").map((c, i) => (
        <span
          key={c + i}
          className="text-white transition-colors ease-linear hover:text-white/0"
        >
          {c}
        </span>
      ))}
    </h1>
  );
}

export default StegasaurHeader;
