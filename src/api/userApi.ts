import { API_BASE } from "../config/apiConfig.ts";

export const userApi = {

    registerUser: async (username: string): Promise<string> => {

        const res: Response = await fetch(`${API_BASE}/user/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: username })
        })

        if(!res.ok) {
            throw new Error(`Error creating user: ${username}`);
        }

        const id: string = await res.text()

        return id.replace(/"/g, "")
    }

}