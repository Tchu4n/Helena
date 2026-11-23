// Where identification goes after signing in: only the store's own two places, never a URL from the form.
export const nextPath = (formData: FormData): "/checkout" | "/conta" => (formData.get("next") === "/conta" ? "/conta" : "/checkout");
