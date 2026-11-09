/**
 * L'enclitica resta attaccata alla base e usa il testo opposto alla parola.
 * Un fondo dedicato evita il caso illeggibile (es. bianco su giallo).
 * Il contorno riprende SEMPRE la tinta grammaticale o manuale della base.
 * La sola UI usa questo stile: l'esportazione PDF segue le tinte in legenda.
 */
export function encliticStyle(chipColor: string, baseTextColor: string) {
  const baseHasLightText = ["#fff7ec", "#ffffff"].includes(baseTextColor.toLowerCase());
  return {
    color: baseHasLightText ? "#1a1a1a" : "#ffffff",
    backgroundColor: baseHasLightText ? "#ffffff" : "#1a1a1a",
    borderColor: chipColor,
  };
}

