type NextSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export async function buildSearchString(
  searchParams: NextSearchParams,
): Promise<string> {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  return params.toString();
}
