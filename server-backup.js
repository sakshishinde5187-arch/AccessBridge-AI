const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

console.log(
    "API key loaded:",
    !!process.env.OPENAI_API_KEY
);

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;


// ===============================
// OpenAI
// ===============================

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


// ===============================
// File Upload
// ===============================

const upload = multer({
    dest: "uploads/"
});


// ===============================
// Static Files
// ===============================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.use(express.json());


// ===============================
// Home
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// ===============================
// Upload + PDF Text Extraction
// ===============================

app.post(
    "/upload",
    upload.single("document"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    message: "Please upload a document."
                });

            }

            console.log(
                "File uploaded:",
                req.file.originalname
            );

            const filePath =
                req.file.path;

            const dataBuffer =
                fs.readFileSync(filePath);

            const parser =
                new PDFParse({
                    data: dataBuffer
                });

            const data =
                await parser.getText();

            await parser.destroy();

            console.log(
                "Text extracted successfully."
            );

            res.json({

                message:
                    "Document uploaded successfully!",

                filename:
                    req.file.originalname,

                text:
                    data.text

            });

        }

        catch (error) {

            console.error(
                "PDF ERROR:",
                error
            );

            res.status(500).json({

                message:
                    error.message ||
                    "Could not read the document."

            });

        }

    }
);


// ===============================
// AI Document Analysis
// ===============================

app.post(
    "/analyze",
    async (req, res) => {

        try {

            const { text } =
                req.body;


            // Check document text
            if (
                !text ||
                typeof text !== "string"
            ) {

                return res.status(400).json({

                    message:
                        "Document text is required."

                });

            }


            console.log(
                "Sending document to AI..."
            );


            const response =
                await client.responses.create({

                    model: "gpt-5.6-luna",

                    instructions: `
You are AccessBridge AI.

You are an accessibility-focused document
understanding assistant.

Your job is to help users understand documents
that may contain OCR errors.

The document text may contain:

- Marathi
- English
- Hindi
- Mixed languages
- Broken words
- Missing spaces
- Incorrect OCR characters
- Numbers separated by spaces
- Formatting problems

IMPORTANT RULES:

1. Understand the document using context.
2. Correct obvious OCR spacing problems mentally.
3. Do NOT invent information.
4. If something is unclear, say "Not clearly mentioned".
5. Preserve names, dates, amounts and important facts
   as accurately as possible.
6. Explain the document in very simple language.
7. The user may have difficulty reading complex text.

Return the result using exactly these sections:

DOCUMENT TYPE:
Give the type of document.

IMPORTANT INFORMATION:
Give the most important facts as short bullet points.

DATES AND DEADLINES:
Mention all important dates and validity periods.

AMOUNTS:
Mention important monetary amounts if present.

REQUIRED DOCUMENTS OR ACTIONS:
Mention documents, requirements or actions found
in the document.

SIMPLE EXPLANATION:
Explain what the document means in simple language
using a short paragraph.

Do not add information that is not present
in the document.
`,

                    input: text

                });


            console.log(
                "AI analysis completed."
            );


            const analysis =
                response.output_text;


            if (
                !analysis ||
                analysis.trim() === ""
            ) {

                throw new Error(
                    "AI returned an empty response."
                );

            }


            res.json({

                analysis:
                    analysis

            });

        }

        catch (error) {

            console.error(
                "==============================="
            );

            console.error(
                "AI ERROR:"
            );

            console.error(
                error
            );

            console.error(
                "==============================="
            );


            res.status(500).json({

                message:
                    error.message ||
                    "AI analysis failed."

            });

        }

    }
);


// ===============================
// Start Server
// ===============================

app.listen(
    PORT,
    () => {

        console.log(
            `AccessBridge AI running at http://localhost:${PORT}`
        );

    }
);
