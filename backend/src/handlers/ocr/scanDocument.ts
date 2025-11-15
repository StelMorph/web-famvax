// lambda-fns/ocr/scanDocument.ts (FINAL - INTELLIGENT MAPPING)

import { TextractClient, AnalyzeDocumentCommand, Block } from '@aws-sdk/client-textract';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { get as levenshtein } from 'fast-levenshtein'; // For Tier 2 Fuzzy Matching

// The SDK will automatically use the region the Lambda is deployed in.
const textractClient = new TextractClient({}); 
const BUCKET_NAME = process.env.SCAN_UPLOADS_BUCKET_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
};

// =================================================================
// TIER 1: KEYWORD MAPPING DICTIONARY
// =================================================================
// Maps various OCR'd labels to your application's standard field names.
// Keys should be lowercase and simple.
const MAPPING_DICTIONARY: Record<string, string> = {
  // Profile Fields
  'name': 'name',
  'patient name': 'name',
  'full name': 'name',
  'dob': 'dob',
  'date of birth': 'dob',
  'birth date': 'dob',
  'born': 'dob',
  'gender': 'gender',
  'sex': 'gender',
  'blood type': 'bloodType',
  'allergies': 'allergies',
  'medical conditions': 'medicalConditions',
  'notes': 'notes',

  // Vaccine Fields
  'vaccine': 'vaccineName',
  'vaccine name': 'vaccineName',
  'immunization': 'vaccineName',
  'product': 'vaccineName',
  'date administered': 'date',
  'vaccination date': 'date',
  'date': 'date',
  'dose': 'dose',
  'lot number': 'lot',
  'lot #': 'lot',
  'lot': 'lot',
  'clinic': 'clinic',
  'administered by': 'clinic',
  'healthcare professional': 'clinic',
  'next due date': 'nextDueDate',
  'next dose due': 'nextDueDate',
  'recall date': 'nextDueDate',
};


/**
 * Main parsing function that orchestrates all tiers of intelligent mapping.
 */
const parseIntelligentResponse = (blocks: Block[]): Record<string, any> => {
    
    // --- Step 1: Get Raw Key-Value Pairs from Textract ---
    const rawData = getRawKeyValuePairs(blocks);
    const normalizedData: Record<string, any> = {};
    const unmappedFields: { key: string, value: string }[] = [];

    // --- Step 2: Tier 1 (Keyword) & Tier 2 (Fuzzy) Mapping ---
    for (const rawKey in rawData) {
        const rawValue = rawData[rawKey];
        const sanitizedKey = rawKey.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        let bestMatchKey = '';
        let lowestDistance = 2; // Threshold: only accept close matches (distance < 2)

        // Find the best fuzzy match in our dictionary
        for (const dictKey in MAPPING_DICTIONARY) {
            const distance = levenshtein(sanitizedKey, dictKey);
            if (distance < lowestDistance) {
                lowestDistance = distance;
                bestMatchKey = MAPPING_DICTIONARY[dictKey];
            }
        }

        if (bestMatchKey) {
            // We found a confident match!
            normalizedData[bestMatchKey] = rawValue;
        } else {
            // Couldn't find a confident match, save for later
            unmappedFields.push({ key: rawKey, value: rawValue });
        }
    }

    // --- Step 3: Tier 3 (Regex) for unmapped values ---
    // Try to find a date in any of the remaining fields
    if (!normalizedData.dob) {
        const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})/;
        for (let i = unmappedFields.length - 1; i >= 0; i--) {
            const field = unmappedFields[i];
            if (dateRegex.test(field.value)) {
                // It looks like a date, let's assume it's the DOB if it's not already found.
                normalizedData.dob = field.value;
                // Remove it from unmapped so it doesn't become a custom field
                unmappedFields.splice(i, 1); 
                break; // Stop after finding the first date
            }
        }
    }

    // --- Step 4: Handle remaining unmapped fields as Custom Fields ---
    if (unmappedFields.length > 0) {
        normalizedData.customFields = unmappedFields.map(f => ({ label: f.key, value: f.value }));
    }
    
    return normalizedData;
};


/**
 * Helper function to extract the raw key-value pairs from Textract's response.
 * (This is your original parsing logic, now modularized).
 */
const getRawKeyValuePairs = (blocks: Block[]): Record<string, string> => {
    const blockMap = new Map<string, Block>();
    blocks.forEach((block) => {
        if (block.Id) blockMap.set(block.Id, block);
    });

    const getWordsText = (block: Block): string => {
        let text = '';
        if (block.Relationships) {
            for (const relationship of block.Relationships) {
                if (relationship.Type === 'CHILD' && relationship.Ids) {
                    text = relationship.Ids.map((id) => blockMap.get(id)?.Text || '').join(' ');
                }
            }
        }
        return text;
    };

    const extractedData: Record<string, string> = {};
    blocks.forEach((block) => {
        if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
            if (block.Relationships) {
                for (const relationship of block.Relationships) {
                    if (relationship.Type === 'VALUE' && relationship.Ids) {
                        const keyText = getWordsText(block).replace(/:/g, '').trim();
                        let valueText = relationship.Ids.map(valueId => {
                            const valueBlock = blockMap.get(valueId);
                            return valueBlock ? getWordsText(valueBlock) : '';
                        }).join(' ');

                        if (keyText) {
                            extractedData[keyText] = valueText.trim();
                        }
                    }
                }
            }
        }
    });
    return extractedData;
};


/**
 * Main Lambda handler.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!BUCKET_NAME) {
    console.error('CRITICAL ERROR: BUCKET_NAME environment variable is not set.');
    return { statusCode: 500, headers: responseHeaders, body: JSON.stringify({ message: 'Server configuration error.' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: 'Bad Request: Missing request body.' }) };
    }
    const { key } = JSON.parse(event.body);
    if (!key || typeof key !== 'string') {
      return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ message: 'Bad Request: "key" is required.' }) };
    }

    const command = new AnalyzeDocumentCommand({
      Document: { S3Object: { Bucket: BUCKET_NAME, Name: key } },
      FeatureTypes: ['FORMS', 'TABLES'],
    });

    const textractResponse = await textractClient.send(command);

    if (!textractResponse.Blocks) {
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify({ extractedData: {}, message: 'No text found.' }) };
    }

    // The magic happens here!
    const extractedData = parseIntelligentResponse(textractResponse.Blocks);

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({ extractedData }),
    };
  } catch (error) {
    console.error('Error scanning document with Textract:', error);
    const errorMessage = (error as Error).message || 'An unknown error occurred.';
    return { statusCode: 500, headers: responseHeaders, body: JSON.stringify({ message: 'Failed to scan document.', error: errorMessage }) };
  }
};