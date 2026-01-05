import axios from "axios";

export const createRetrieveAttestation = async (
    transactionHash: string,
    chainId: string,
    timeout = 60000
) => {
    const baseUrl = "https://iris-api.circle.com";

    const url = `${baseUrl}/v2/messages/${chainId}?transactionHash=${transactionHash}`;

    const start = Date.now();
    const FIVE_SECONDS = 5000;

    while (true) {
        const elapsed = Date.now() - start;
        if (elapsed > timeout) {
            throw new Error(
                "Timeout: Attestation not retrieved within the expected time."
            );
        }

        try {
            const response = await axios.get(url);

            const message = response.data?.messages?.[0];
            if (message?.status === "complete") {
                console.log("Attestation retrieved successfully!");
                return message;
            }

            console.log("Waiting for attestation...");
        } catch (error: any) {
            const status = error.response?.status;

            if (status === 404) {
                console.log("Waiting for attestation...");
            } else {
                console.error("Error fetching attestation:", error.message);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, FIVE_SECONDS));
    }
};
