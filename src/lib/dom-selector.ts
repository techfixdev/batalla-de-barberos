export function requireElementById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Expected an element with id "${id}".`);
  }

  return element as T;
}
