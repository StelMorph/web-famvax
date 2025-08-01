    // src/api/apiService.js

    import awsConfig from '../../aws-config.js';

    const getAuthHeaders = () => {
        const idToken = localStorage.getItem('idToken');
        if (!idToken) throw new Error("Authentication token not found. Please log in.");
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };
    };

    const handleResponse = async (response) => {
        // 204 No Content is a successful response
        if (response.status === 204) return null;
        
        const text = await response.text();
        if (!response.ok) {
            let errorBody;
            try { errorBody = JSON.parse(text); } catch (e) { errorBody = { message: text || `Request failed with status ${response.status}` }; }
            throw new Error(errorBody.message);
        }

        try { return JSON.parse(text); } catch (e) { return null; }
    };

    const api = {
        // --- Profile API ---
        getOwnedProfiles: async () => (await fetch(`${awsConfig.api.invokeUrl}/profiles`, { headers: getAuthHeaders() }).then(handleResponse)) || [],
        createProfile: (profileData) => fetch(`${awsConfig.api.invokeUrl}/profiles`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(profileData) }).then(handleResponse),
        updateProfile: (profileId, profileData) => fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(profileData) }).then(handleResponse),
        deleteProfile: (profileId) => fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
        
        // --- Vaccine API ---
        getProfileVaccines: async (profileId) => (await fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}/vaccines`, { headers: getAuthHeaders() }).then(handleResponse)) || [],
        createVaccine: (profileId, vaccineData) => fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}/vaccines`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(vaccineData) }).then(handleResponse),
        updateVaccine: (vaccineId, vaccineData) => fetch(`${awsConfig.api.invokeUrl}/vaccines/${vaccineId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(vaccineData) }).then(handleResponse),
        deleteVaccine: (vaccineId) => fetch(`${awsConfig.api.invokeUrl}/vaccines/${vaccineId}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),

        // --- Sharing API ---
        getReceivedShares: async () => (await fetch(`${awsConfig.api.invokeUrl}/shares/received`, { headers: getAuthHeaders() }).then(handleResponse)) || [],
        getSharedProfileDetails: (profileId) => fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}`, { headers: getAuthHeaders() }).then(handleResponse),
        acceptShare: (shareId) => fetch(`${awsConfig.api.invokeUrl}/shares/${shareId}/accept`, { method: 'PUT', headers: getAuthHeaders() }).then(handleResponse),
        deleteShare: (shareId) => fetch(`${awsConfig.api.invokeUrl}/shares/${shareId}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
        getProfileShares: async (profileId) => (await fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}/shares`, { headers: getAuthHeaders() }).then(handleResponse)) || [],
        createShare: (profileId, shareData) => fetch(`${awsConfig.api.invokeUrl}/profiles/${profileId}/share`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(shareData) }).then(handleResponse),
    };

    export default api;