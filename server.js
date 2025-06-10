require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Sanskrit text cleaning function
function cleanSanskritText(text) {
    // Remove duplicate verses
    text = text.replace(/(\*\*[\s\S]+?\*\*)\s*\1/g, '$1');
    
    // Convert IAST to Devanagari mapping
    const iastToDevanagari = {
        'ā': 'ा', 'ī': 'ी', 'ū': 'ू', 'ṛ': 'ृ', 'ṝ': 'ॄ',
        'ḷ': 'ऌ', 'ṃ': 'ं', 'ḥ': 'ः', 'ṅ': 'ङ', 'ñ': 'ञ',
        'ṭ': 'ट', 'ḍ': 'ड', 'ṇ': 'ण', 'ś': 'श', 'ṣ': 'ष',
        'a': 'अ', 'i': 'इ', 'u': 'उ', 'e': 'ए', 'o': 'ओ',
        'k': 'क', 'g': 'ग', 'c': 'च', 'j': 'ज', 't': 'त',
        'd': 'द', 'n': 'न', 'p': 'प', 'b': 'ब', 'm': 'म',
        'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'h': 'ह',
        's': 'स'
    };

    // Function to convert IAST to Devanagari
    function toDevanagari(match) {
        let verse = match.replace(/\*\*/g, '').trim();
        // Store transliteration
        const transliteration = verse;
        
        // Convert to Devanagari
        Object.entries(iastToDevanagari).forEach(([iast, dev]) => {
            verse = verse.replace(new RegExp(iast, 'g'), dev);
        });

        // Format with both scripts
        return `<div class="sanskrit-verse">
            <div class="devanagari">${verse}</div>
            <div class="transliteration">${transliteration}</div>
        </div>`;
    }

    // Replace Sanskrit verses with formatted versions
    return text.replace(/\*\*([\s\S]+?)\*\*/g, toDevanagari);
}

// Function to convert Roman numerals to numbers
function romanToNumber(roman) {
    const romanValues = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    };
    
    let result = 0;
    for (let i = 0; i < roman.length; i++) {
        const current = romanValues[roman[i]];
        const next = romanValues[roman[i + 1]];
        if (next > current) {
            result += next - current;
            i++;
        } else {
            result += current;
        }
    }
    return result;
}

// Function to convert Roman numerals in text to numbers
function convertRomanToNumbers(text) {
    return text.replace(/Chapter\s+([IVXLCDM]+)/gi, (match, roman) => {
        return `Chapter ${romanToNumber(roman.toUpperCase())}`;
    }).replace(/Verse\s+([IVXLCDM]+)/gi, (match, roman) => {
        return `Verse ${romanToNumber(roman.toUpperCase())}`;
    });
}

// Function to format Sanskrit verses
function formatVerse(text) {
    // First clean Sanskrit text
    text = cleanSanskritText(text);
    
    // Split response into sections
    const sections = text.split('\n\n');
    let formattedSections = sections.map(section => {
        // Skip sections that are already formatted as Sanskrit verses
        if (section.includes('class="sanskrit-verse"')) {
            return section;
        }
        // Check if this is a translation
        else if (section.toLowerCase().includes('translation') || 
                 section.startsWith('"') || 
                 section.startsWith('(')) {
            return `<div class="verse-translation">${section}</div>`;
        }
        // Regular text
        return `<div class="verse-explanation">${section}</div>`;
    });

    return formattedSections.join('\n\n');
}

// Helper function to generate Gita-focused prompt
function createGitaPrompt(userQuestion) {
    return `You are Lord Krishna providing guidance based on the Bhagavad Gita. 
    When responding, follow this exact format:
    1. Start with "Chapter X, Verse Y:"
    2. Then provide the Sanskrit verse between ** marks for proper formatting
    3. Then provide the English translation in quotes
    4. Finally, give your personal explanation as Lord Krishna speaking directly to the devotee
    5. End with a loving reminder of your presence and guidance

    Important:
    - Enclose Sanskrit verses between ** marks
    - Use standard IAST format for Sanskrit transliteration
    - Clearly separate each section with blank lines
    - Make sure translations are accurate and clear

    Respond to this devotee's question: ${userQuestion}`;
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // For text-only input, use the gemini-pro model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = createGitaPrompt(message);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Convert any Roman numerals in chapter/verse references to numbers
        text = convertRomanToNumbers(text);
        
        // Format Sanskrit verses and translations
        text = formatVerse(text);

        if (!text) {
            throw new Error('No response generated');
        }
        
        res.json({ response: text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'An error occurred while processing your request',
            details: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
