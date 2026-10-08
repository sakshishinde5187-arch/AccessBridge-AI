const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");

function scrollToUpload() {
    document.getElementById("upload").scrollIntoView({
        behavior: "smooth"
    });
}

fileInput.addEventListener("change", () => {

    if (fileInput.files.length > 0) {

        fileName.textContent =
            fileInput.files[0].name;

    } else {

        fileName.textContent =
            "No file selected";

    }

});


analyzeBtn.addEventListener("click", async () => {

    if (fileInput.files.length === 0) {

        alert(
            "Please choose a document first."
        );

        return;
    }


    const selectedLanguage =
        document.querySelector(
            'input[name="language"]:checked'
        ).value;


    const formData =
        new FormData();


    formData.append(
        "document",
        fileInput.files[0]
    );


    analyzeBtn.textContent =
        "Reading Document...";

    analyzeBtn.disabled =
        true;


    try {

        const response =
            await fetch("/upload", {

                method: "POST",

                body:
                    formData

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Document upload failed."
            );

        }


        document.getElementById(
            "result"
        ).style.display =
            "block";


        document.getElementById(
            "extractedText"
        ).textContent =
            data.text;


        await analyzeDocumentWithAI(
            data.text,
            selectedLanguage
        );

    }


    catch (error) {

        console.error(error);


        alert(
            error.message ||
            "Something went wrong while analyzing the document."
        );

    }


    finally {

        analyzeBtn.textContent =
            "Analyze Document";

        analyzeBtn.disabled =
            false;

    }

});


async function analyzeDocumentWithAI(
    text,
    selectedLanguage
) {

    const importantInfo =
        document.getElementById(
            "importantInfo"
        );


    const importantDetails =
        document.getElementById(
            "importantDetails"
        );


    const simpleExplanation =
        document.getElementById(
            "simpleExplanation"
        );


    const explanationText =
        document.getElementById(
            "explanationText"
        );


    const listenSection =
        document.getElementById(
            "listenSection"
        );


    importantInfo.style.display =
        "block";


    simpleExplanation.style.display =
        "block";


    listenSection.style.display =
        "block";


    importantDetails.innerHTML =
        "<p>🤖 AccessBridge AI is understanding your document...</p>";


    explanationText.textContent =
        "Please wait while AI analyzes the document.";


    try {

        const response =
            await fetch("/analyze", {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        text:
                            text,

                        language:
                            selectedLanguage

                    })

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "AI analysis failed."
            );

        }


        const aiText =
            data.analysis;


        console.log(
            "AI Response:"
        );


        console.log(
            aiText
        );


        const normalizedText =
            normalizeAIText(
                aiText
            );


        const documentType =
            extractSection(
                normalizedText,
                "DOCUMENT TYPE:",
                "IMPORTANT INFORMATION:"
            );


        const importantInformation =
            extractSection(
                normalizedText,
                "IMPORTANT INFORMATION:",
                "DATES AND DEADLINES:"
            );


        const dates =
            extractSection(
                normalizedText,
                "DATES AND DEADLINES:",
                "AMOUNTS:"
            );


        const amounts =
            extractSection(
                normalizedText,
                "AMOUNTS:",
                "REQUIRED DOCUMENTS OR ACTIONS:"
            );


        const requiredActions =
            extractSection(
                normalizedText,
                "REQUIRED DOCUMENTS OR ACTIONS:",
                "SIMPLE EXPLANATION:"
            );


        const simpleExplanationText =
            extractSection(
                normalizedText,
                "SIMPLE EXPLANATION:",
                null
            );


        importantDetails.innerHTML =
            "";


        if (documentType) {

            addResultSection(
                importantDetails,

                getHeading(
                    "documentType",
                    selectedLanguage
                ),

                documentType
            );

        }


        if (importantInformation) {

            addResultSection(
                importantDetails,

                getHeading(
                    "important",
                    selectedLanguage
                ),

                importantInformation
            );

        }


        if (dates) {

            addResultSection(
                importantDetails,

                getHeading(
                    "dates",
                    selectedLanguage
                ),

                dates
            );

        }


        if (amounts) {

            addResultSection(
                importantDetails,

                getHeading(
                    "amounts",
                    selectedLanguage
                ),

                amounts
            );

        }


        if (requiredActions) {

            addResultSection(
                importantDetails,

                getHeading(
                    "required",
                    selectedLanguage
                ),

                requiredActions
            );

        }


        explanationText.textContent =
            simpleExplanationText ||
            "No simple explanation was provided.";


        window.accessBridgeLanguage =
            selectedLanguage;

    }


    catch (error) {

        console.error(
            "AI Analysis Error:",
            error
        );


        importantDetails.innerHTML =
            "<p>❌ AI analysis could not be completed.</p>";


        explanationText.textContent =
            "We could not analyze this document right now. Please check your server and API configuration.";

    }

}


function normalizeAIText(text) {

    if (!text) {

        return "";

    }


    let cleaned =
        text;


    cleaned =
        cleaned.replace(
            /AMOunts\s*:/gi,
            "AMOUNTS:"
        );


    cleaned =
        cleaned.replace(
            /AMOUNTS\s*:/gi,
            "AMOUNTS:"
        );


    cleaned =
        cleaned.replace(
            /DOCUMENT\s+TYPE\s*:/gi,
            "DOCUMENT TYPE:"
        );


    cleaned =
        cleaned.replace(
            /IMPORTANT\s+INFORMATION\s*:/gi,
            "IMPORTANT INFORMATION:"
        );


    cleaned =
        cleaned.replace(
            /DATES\s+AND\s+DEADLINES\s*:/gi,
            "DATES AND DEADLINES:"
        );


    cleaned =
        cleaned.replace(
            /REQUIRED\s+DOCUMENTS\s+OR\s+ACTIONS\s*:/gi,
            "REQUIRED DOCUMENTS OR ACTIONS:"
        );


    cleaned =
        cleaned.replace(
            /SIMPLE\s+EXPLANATION\s*:/gi,
            "SIMPLE EXPLANATION:"
        );


    return cleaned.trim();

}


function extractSection(
    text,
    startHeading,
    endHeading
) {

    const upperText =
        text.toUpperCase();


    const upperStart =
        startHeading.toUpperCase();


    const startIndex =
        upperText.indexOf(
            upperStart
        );


    if (startIndex === -1) {

        return "";

    }


    const contentStart =
        startIndex +
        startHeading.length;


    let contentEnd =
        text.length;


    if (endHeading) {

        const upperEnd =
            endHeading.toUpperCase();


        const endIndex =
            upperText.indexOf(
                upperEnd,
                contentStart
            );


        if (endIndex !== -1) {

            contentEnd =
                endIndex;

        }

    }


    return text
        .substring(
            contentStart,
            contentEnd
        )
        .trim();

}


function addResultSection(
    parent,
    heading,
    content
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "analysis-section";


    const title =
        document.createElement(
            "h3"
        );


    title.textContent =
        heading;


    const details =
        document.createElement(
            "div"
        );


    details.textContent =
        content;


    details.style.whiteSpace =
        "pre-wrap";


    section.appendChild(
        title
    );


    section.appendChild(
        details
    );


    parent.appendChild(
        section
    );

}


function getHeading(
    section,
    language
) {

    if (language === "mr") {

        const headings = {

            documentType:
                "📄 दस्तावेजाचा प्रकार",

            important:
                "📌 महत्त्वाची माहिती",

            dates:
                "📅 महत्त्वाच्या तारखा",

            amounts:
                "💰 उत्पन्न / रक्कम",

            required:
                "📋 आवश्यक कागदपत्रे / कृती"

        };


        return headings[section];

    }


    const headings = {

        documentType:
            "📄 Document Type",

        important:
            "📌 Important Information",

        dates:
            "📅 Dates & Deadlines",

        amounts:
            "💰 Amounts",

        required:
            "📋 Required Documents / Actions"

    };


    return headings[section];

}


// =====================================
// GEMINI TTS LISTEN
// =====================================

const listenBtn =
    document.getElementById(
        "listenBtn"
    );


let currentAudio = null;


listenBtn.addEventListener(
    "click",
    async () => {

        const text =
            document.getElementById(
                "explanationText"
            ).textContent;


        if (!text) {

            alert(
                "There is no explanation to read."
            );

            return;

        }


        try {

            listenBtn.disabled =
                true;


            listenBtn.textContent =
                "🔊 Generating Audio...";


            // Stop previous audio
            if (currentAudio) {

                currentAudio.pause();

                currentAudio.currentTime =
                    0;

            }


            const language =
                window.accessBridgeLanguage ||
                "en";


            const response =
                await fetch(
                    "/speak",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                text:
                                    text,

                                language:
                                    language

                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Text to speech failed."
                );

            }


            // Convert base64 WAV
            // to playable audio
            const audioUrl =
                "data:" +
                data.mimeType +
                ";base64," +
                data.audio;


            currentAudio =
                new Audio(
                    audioUrl
                );


            listenBtn.textContent =
                "🔊 Playing...";


            await currentAudio.play();


            currentAudio.onended =
                () => {

                    listenBtn.disabled =
                        false;

                    listenBtn.textContent =
                        "🔊 Listen to Explanation";

                };

        }


        catch (error) {

            console.error(
                "TTS Error:",
                error
            );


            alert(
                error.message ||
                "Could not generate audio."
            );


            listenBtn.disabled =
                false;


            listenBtn.textContent =
                "🔊 Listen to Explanation";

        }

    }
);