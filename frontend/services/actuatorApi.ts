const API_BASE_URL = 'http://localhost:5000/api';

export const getActuators = async () => {
    const response = await fetch(`${API_BASE_URL}/actuators`);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    return await response.json();
};

export const toggleActuatorAPI = async (key: string, state: boolean) => {
    const response = await fetch(`${API_BASE_URL}/actuators/${key}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
    });
    if (!response.ok) {
        throw new Error(`Command Failed: ${response.status}`);
    }
    return await response.json();
};
