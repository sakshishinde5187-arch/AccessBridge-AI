const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

console.log(
    "Gemini API key loaded:",
    !!process.env.GEMINI_API_KEY
);

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;


// =====================================
// GEMINI AI
// =====================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// =====================================
// FILE UPLOAD - SECURITY
// =====================================

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({

    dest: path.join(
        __dirname,
        "uploads"
    ),

    limits: {
        fileSize: MAX_FILE_SIZE
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only PDF, JPG, PNG and WEBP files are supported."
                )
            );

        }

    }

});


// =====================================
// STATIC FILES
// =====================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

app.use(
    express.json({
        limit: "1mb"
    })
);


// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// =====================================
// UPLOAD DOCUMENT
// PDF + IMAGE
// =====================================

app.post(
    "/upload",
    upload.single("document"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    message:
                        "Please upload a document."

                });

            }


            console.log(
                "File uploaded:",
                req.file.originalname
            );

            console.log(
                "File type:",
                req.file.mimetype
            );


            const filePath =
                req.file.path;


            // =====================================
            // IMAGE UPLOAD
            // =====================================

            if (
                req.file.mimetype.startsWith(
                    "image/"
                )
            ) {

                console.log(
                    "Image detected."
                );

                console.log(
                    "Sending image to Gemini Vision..."
                );


                const imageBuffer =
                    fs.readFileSync(
                        filePath
                    );


                const base64Image =
                    imageBuffer.toString(
                        "base64"
                    );


                const imagePrompt = `
You are AccessBridge AI.

Read and understand this document image.

The image may contain:

- Marathi
- English
- Hindi
- Mixed languages
- Official documents
- Notices
- Certificates
- Forms
- Government documents
- OCR-like difficult text

Extract all important information
from the image accurately.

Do NOT invent information.

If something is unclear, write:

"Not clearly mentioned."

Keep:

- Names accurate
- Dates accurate
- Amounts accurate
- Addresses accurate
- Document numbers accurate

Return ONLY the readable document text.

Do not explain the document.

Do not summarize it.

Just extract the text from the image.
`;


                const response =
                    await ai.models.generateContent({

                        model:
                            "gemini-3.5-flash-lite",

                        contents: [

                            {
                                role: "user",

                                parts: [

                                    {
                                        inlineData: {

                                            mimeType:
                                                req.file.mimetype,

                                            data:
                                                base64Image

                                        }
                                    },

                                    {
                                        text:
                                            imagePrompt
                                    }

                                ]

                            }

                        ]

                    });


                const extractedText =
                    response.text;


                console.log(
                    "Image text extraction completed."
                );


                if (
                    !extractedText ||
                    extractedText.trim() === ""
                ) {

                    throw new Error(
                        "Could not extract text from the image."
                    );

                }


                if (
                    fs.existsSync(
                        filePath
                    )
                ) {

                    fs.unlinkSync(
                        filePath
                    );

                }


                return res.json({

                    message:
                        "Image uploaded successfully!",

                    filename:
                        req.file.originalname,

                    text:
                        extractedText.trim()

                });

            }


            // =====================================
            // PDF UPLOAD
            // =====================================

            if (
                req.file.mimetype ===
                "application/pdf"
            ) {

                console.log(
                    "PDF detected."
                );


                const dataBuffer =
                    fs.readFileSync(
                        filePath
                    );


                const parser =
                    new PDFParse({

                        data:
                            dataBuffer

                    });


                const data =
                    await parser.getText();


                await parser.destroy();


                // =====================================
                // OCR TEXT CLEANUP
                // =====================================

                let cleanedText =
                    data.text;


                cleanedText =
                    cleanedText
                        .replace(
                            /[ \t]+/g,
                            " "
                        );


                cleanedText =
                    cleanedText
                        .replace(
                            /\n\s+/g,
                            "\n"
                        );


                cleanedText =
                    cleanedText
                        .replace(
                            /\s+\n/g,
                            "\n"
                        );


                cleanedText =
                    cleanedText
                        .replace(
                            /\n{3,}/g,
                            "\n\n"
                        );


                cleanedText =
                    cleanedText.trim();


                console.log(
                    "PDF text extracted successfully."
                );


                console.log(
                    "OCR text cleaned successfully."
                );


                if (
                    fs.existsSync(
                        filePath
                    )
                ) {

                    fs.unlinkSync(
                        filePath
                    );

                }


                return res.json({

                    message:
                        "Document uploaded successfully!",

                    filename:
                        req.file.originalname,

                    text:
                        cleanedText

                });

            }


            // =====================================
            // UNSUPPORTED FILE
            // =====================================

            if (
                fs.existsSync(
                    filePath
                )
            ) {

                fs.unlinkSync(
                    filePath
                );

            }


            return res.status(400).json({

                message:
                    "Only PDF, JPG, PNG and WEBP files are supported."

            });

        }


        catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "UPLOAD ERROR:"
            );

            console.error(
                error.message
            );

            console.error(
                "================================"
            );


            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                }
                catch (deleteError) {

                    console.error(
                        "Could not delete temporary file:",
                        deleteError.message
                    );

                }

            }


            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    message:
                        "File is too large. Maximum size is 10 MB."

                });

            }


            if (
                error.message &&
                error.message.includes(
                    "Only PDF"
                )
            ) {

                return res.status(400).json({

                    message:
                        error.message

                });

            }


            return res.status(500).json({

                message:
                    "Could not read the document."

            });

        }

    }
);


// =====================================
// GEMINI AI DOCUMENT ANALYSIS
// =====================================

app.post(
    "/analyze",
    async (req, res) => {

        try {

            const {
                text,
                language
            } = req.body;


            if (
                !text ||
                typeof text !== "string"
            ) {

                return res.status(400).json({

                    message:
                        "Document text is required."

                });

            }


            const MAX_TEXT_LENGTH =
                100000;


            if (
                text.length >
                MAX_TEXT_LENGTH
            ) {

                return res.status(400).json({

                    message:
                        "The document text is too large to analyze."

                });

            }


            if (
                language !== "mr" &&
                language !== "en"
            ) {

                return res.status(400).json({

                    message:
                        "Invalid language selected."

                });

            }


            let languageInstruction;


            if (
                language === "mr"
            ) {

                languageInstruction = `

The user selected MARATHI.

Write ALL SECTION CONTENT in simple,
natural and easy-to-understand Marathi.

Important:

- The six section headings listed below
  MUST remain EXACTLY in English.

- Do NOT translate the section headings.

- Only the content under each heading
  should be written in Marathi.

Use simple Marathi suitable for a person
who may have difficulty understanding
official documents.

Correct obvious OCR spelling mistakes
when the intended word is clear.

For example:

"उत्पनाचा दाखला" → "उत्पन्नाचा दाखला"

But DO NOT change names, dates, amounts,
addresses or other facts unless the OCR
error is clearly obvious from context.

Keep names, places, dates and numbers
accurate.

`;

            }

            else {

                languageInstruction = `

The user selected ENGLISH.

Write ALL SECTION CONTENT in simple,
easy-to-understand English.

Important:

- The six section headings listed below
  MUST remain EXACTLY in English.

- Do NOT translate or rename the headings.

- Only the content under each heading
  should be written in English.

Correct obvious OCR spacing or spelling
problems when the intended meaning is clear.

Keep names, places, dates and numbers
accurate.

`;

            }


            console.log(
                "Selected language:",
                language === "mr"
                    ? "Marathi"
                    : "English"
            );


            console.log(
                "Sending document to Gemini AI..."
            );


            const prompt = `

You are AccessBridge AI.

You are an accessibility-focused document
understanding assistant.

Your job is to help people understand
official or difficult documents.

The document may contain:

- Marathi
- English
- Hindi
- Mixed languages
- OCR errors
- Broken words
- Missing spaces
- Incorrect characters
- Numbers separated by spaces
- Formatting problems

Understand the document using context.

Do NOT invent information.

If information is genuinely unclear,
write:

"Not clearly mentioned."

Do not guess.

Do not change dates.

Do not change monetary amounts.

Do not invent documents or requirements.

Do not add information that is not present
in the document.

${languageInstruction}


===========================================
VERY IMPORTANT OUTPUT RULE
===========================================

Your response MUST contain EXACTLY these
six section headings.

Copy them character-for-character.

DOCUMENT TYPE:

IMPORTANT INFORMATION:

DATES AND DEADLINES:

AMOUNTS:

REQUIRED DOCUMENTS OR ACTIONS:

SIMPLE EXPLANATION:


IMPORTANT:

1. Do NOT change these headings.

2. Do NOT translate these headings.

3. Do NOT rename these headings.

4. Do NOT merge two sections.

5. Do NOT put information from one section
   into another section.

6. Do NOT create additional headings.

7. Do NOT write anything before
   DOCUMENT TYPE:

8. Do NOT write anything after the
   SIMPLE EXPLANATION content.

9. Each heading must appear exactly once.

10. Put each heading on its own line.


===========================================
SECTION RULES
===========================================

DOCUMENT TYPE:

Identify what type of document this is.


IMPORTANT INFORMATION:

Give the most important facts from
the document as short bullet points.


DATES AND DEADLINES:

Include important dates, issue dates,
validity dates, deadlines and periods.


AMOUNTS:

Include important monetary amounts,
income, fees, payments or other
financial information.


REQUIRED DOCUMENTS OR ACTIONS:

Mention documents, requirements,
conditions or actions that the user
needs to know about.


SIMPLE EXPLANATION:

Explain the document in one short,
simple paragraph.

The explanation should help a person
understand what the document means
without using complicated official language.


===========================================
DOCUMENT
===========================================

${text}

`;


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt

                });


            const analysis =
                response.text;


            console.log(
                "Gemini analysis completed."
            );


            if (
                !analysis ||
                analysis.trim() === ""
            ) {

                throw new Error(
                    "Gemini returned an empty response."
                );

            }


            console.log(
                "--------------------------------"
            );

            console.log(
                "AI RESPONSE:"
            );

            console.log(
                analysis
            );

            console.log(
                "--------------------------------"
            );


            return res.json({

                analysis:
                    analysis.trim()

            });

        }


        catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "GEMINI ERROR:"
            );

            console.error(
                error.message
            );

            console.error(
                "================================"
            );


            return res.status(500).json({

                message:
                    "AI analysis failed. Please try again."

            });

        }

    }
);


// =====================================
// GEMINI TEXT TO SPEECH
// =====================================


// =====================================
// SMOOTH AUDIO END
// Removes small noise/click at the end
// =====================================

function fadeOutPcm(
    pcmBuffer,
    sampleRate = 24000,
    channels = 1,
    fadeDurationMs = 100
) {

    const bytesPerSample = 2;

    const totalSamples =
        Math.floor(
            pcmBuffer.length /
            (bytesPerSample * channels)
        );

    const fadeSamples =
        Math.min(
            totalSamples,
            Math.floor(
                sampleRate *
                fadeDurationMs /
                1000
            )
        );

    const startSample =
        totalSamples -
        fadeSamples;


    for (
        let i = 0;
        i < fadeSamples;
        i++
    ) {

        const sampleIndex =
            startSample + i;

        const fadeFactor =
            1 -
            (
                i /
                fadeSamples
            );


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const byteIndex =
                (
                    sampleIndex *
                    channels +
                    channel
                ) *
                bytesPerSample;


            const originalSample =
                pcmBuffer.readInt16LE(
                    byteIndex
                );


            const fadedSample =
                Math.round(
                    originalSample *
                    fadeFactor
                );


            pcmBuffer.writeInt16LE(
                fadedSample,
                byteIndex
            );

        }

    }

    return pcmBuffer;
}


// =====================================
// PCM TO WAV
// =====================================

function pcmToWav(
    pcmBuffer,
    sampleRate = 24000,
    channels = 1,
    bitsPerSample = 16
) {

    const byteRate =
        sampleRate *
        channels *
        bitsPerSample /
        8;

    const blockAlign =
        channels *
        bitsPerSample /
        8;

    const wavHeader =
        Buffer.alloc(44);


    // RIFF
    wavHeader.write(
        "RIFF",
        0
    );

    wavHeader.writeUInt32LE(
        36 + pcmBuffer.length,
        4
    );

    wavHeader.write(
        "WAVE",
        8
    );


    // fmt
    wavHeader.write(
        "fmt ",
        12
    );

    wavHeader.writeUInt32LE(
        16,
        16
    );

    wavHeader.writeUInt16LE(
        1,
        20
    );

    wavHeader.writeUInt16LE(
        channels,
        22
    );

    wavHeader.writeUInt32LE(
        sampleRate,
        24
    );

    wavHeader.writeUInt32LE(
        byteRate,
        28
    );

    wavHeader.writeUInt16LE(
        blockAlign,
        32
    );

    wavHeader.writeUInt16LE(
        bitsPerSample,
        34
    );


    // data
    wavHeader.write(
        "data",
        36
    );

    wavHeader.writeUInt32LE(
        pcmBuffer.length,
        40
    );


    return Buffer.concat([
        wavHeader,
        pcmBuffer
    ]);

}


// =====================================
// SPEAK ROUTE
// =====================================

app.post(
    "/speak",
    async (req, res) => {

        try {

            const {
                text,
                language
            } = req.body;


            // =====================================
            // VALIDATE TEXT
            // =====================================

            if (
                !text ||
                typeof text !== "string"
            ) {

                return res.status(400).json({

                    message:
                        "Text is required."

                });

            }


            // =====================================
            // TEXT SIZE SECURITY
            // =====================================

            if (
                text.length > 5000
            ) {

                return res.status(400).json({

                    message:
                        "Text is too long."

                });

            }


            // =====================================
            // VALIDATE LANGUAGE
            // =====================================

            if (
                language !== "mr" &&
                language !== "en"
            ) {

                return res.status(400).json({

                    message:
                        "Invalid language."

                });

            }


            console.log(
                "Generating TTS:",
                language === "mr"
                    ? "Marathi"
                    : "English"
            );


            // =====================================
            // GEMINI TTS
            // =====================================

            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.8-flash-tts",

                    contents: [
                        {
                            role: "user",

                            parts: [
                                {
                                    text:
                                        text
                                }
                            ]
                        }
                    ],

                    config: {

                        responseModalities: [
                            "AUDIO"
                        ],

                        speechConfig: {

                            languageCode:
                                language === "mr"
                                    ? "mr-IN"
                                    : "en-IN",

                            voiceConfig: {

                                prebuiltVoiceConfig: {

                                    voiceName:
                                        "Kore"

                                }

                            }

                        }

                    }

                });


            // =====================================
            // GET AUDIO DATA
            // =====================================

            const audioData =
                response
                    .candidates?.[0]
                    ?.content?.parts?.[0]
                    ?.inlineData?.data;


            if (!audioData) {

                throw new Error(
                    "No audio returned by Gemini."
                );

            }


            // =====================================
            // CONVERT BASE64 TO PCM
            // =====================================

            const pcmBuffer =
                Buffer.from(
                    audioData,
                    "base64"
                );


            // =====================================
            // SMOOTH AUDIO END
            // =====================================

            fadeOutPcm(
                pcmBuffer,
                24000,
                1,
                100
            );


            // =====================================
            // CONVERT PCM TO WAV
            // =====================================

            const wavBuffer =
                pcmToWav(
                    pcmBuffer,
                    24000,
                    1,
                    16
                );


            const base64Wav =
                wavBuffer.toString(
                    "base64"
                );


            console.log(
                "TTS audio generated successfully."
            );


            // =====================================
            // SEND AUDIO
            // =====================================

            return res.json({

                audio:
                    base64Wav,

                mimeType:
                    "audio/wav"

            });

        }


        catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "TTS ERROR:"
            );

            console.error(
                error.message
            );

            console.error(
                "================================"
            );


            return res.status(500).json({

                message:
                    "Text to speech failed."

            });

        }

    }
);


// =====================================
// MULTER ERROR HANDLER
// =====================================

app.use(
    (error, req, res, next) => {

        if (!error) {

            return next();

        }


        console.error(
            "UPLOAD MIDDLEWARE ERROR:",
            error.message
        );


        if (
            error.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res.status(400).json({

                message:
                    "File is too large. Maximum size is 10 MB."

            });

        }


        if (
            error.message &&
            error.message.includes(
                "Only PDF"
            )
        ) {

            return res.status(400).json({

                message:
                    error.message

            });

        }


        return res.status(400).json({

            message:
                "Invalid file upload."

        });

    }
);


// =====================================
// START SERVER
// =====================================

app.listen(
    PORT,
    () => {

        console.log(
            `AccessBridge AI running at http://localhost:${PORT}`
        );

    }
);