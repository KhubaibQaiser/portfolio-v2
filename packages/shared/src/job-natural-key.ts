function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hostnameFromUrl(applyUrl: string): string | null {
  const match = /^https?:\/\/([^/?#]+)/i.exec(applyUrl);
  if (!match?.[1]) return null;
  return match[1].replace(/^www\./, "").toLowerCase();
}

export function companyDomainFromName(company: string, applyUrl?: string): string {
  if (applyUrl) {
    const host = hostnameFromUrl(applyUrl);
    if (host && !host.includes("greenhouse") && !host.includes("lever.co")) {
      return host;
    }
  }
  return normalizeToken(company).replace(/\s+/g, "");
}

export function jobNaturalKeyInput(input: {
  company: string;
  title: string;
  location: string;
  applyUrl?: string;
}): string {
  const domain = companyDomainFromName(input.company, input.applyUrl);
  return `${domain}|${normalizeToken(input.title)}|${normalizeToken(input.location)}`;
}
