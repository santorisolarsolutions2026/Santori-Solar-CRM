const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\anish\\.gemini\\antigravity\\brain\\ebf95db8-8e72-4ef5-838e-9a81ed417e9f\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, '..', 'prompts_list.txt');

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  let outputText = '========================================= \n';
  outputText += '  CHRONOLOGICAL LIST OF USER PROMPTS \n';
  outputText += '========================================= \n\n';

  let count = 1;
  lines.forEach((line) => {
    if (!line.trim()) return;
    try {
      const step = JSON.parse(line);
      if (step.source === 'USER_EXPLICIT' && step.type === 'USER_INPUT') {
        let rawContent = step.content;
        
        // Strip out metadata tags if they exist
        rawContent = rawContent.replace(/<USER_REQUEST>[\s\S]*?<\/USER_REQUEST>/g, (match) => {
          return match.replace(/<\/?USER_REQUEST>/g, '');
        });
        rawContent = rawContent.replace(/<USER_INFORMATION>[\s\S]*?<\/USER_INFORMATION>/g, '');
        rawContent = rawContent.replace(/<USER_RULES>[\s\S]*?<\/USER_RULES>/g, '');
        rawContent = rawContent.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '');
        rawContent = rawContent.replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '');

        const cleanedContent = rawContent.trim();
        if (cleanedContent) {
          outputText += `Prompt #${count} (Date: ${step.created_at || 'N/A'}):\n`;
          outputText += `-----------------------------------------\n`;
          outputText += cleanedContent + '\n\n';
          count++;
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  });

  fs.writeFileSync(outputPath, outputText, 'utf8');
  console.log(`Successfully extracted ${count - 1} prompts to ${outputPath}`);
} catch (error) {
  console.error('Failed to parse transcript logs:', error);
}
