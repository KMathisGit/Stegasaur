function StegasaurHeader() {
  return (
    <h1
      onClick={() => location.reload()}
      className="cursor-pointer font-pixilify h-24 mt-4 sm:mt-10 flex items-center justify-center uppercase font-semibold tracking-wide header-text-shadow"
    >
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
