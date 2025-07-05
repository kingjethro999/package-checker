import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

interface AIAnalysisResult {
  packageUpdates: PackageUpdate[];
  securityIssues: SecurityIssue[];
  codeSuggestions: CodeSuggestion[];
  performanceTips: PerformanceTip[];
  summary: string;
}

interface PackageUpdate {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'patch' | 'minor' | 'major';
  description: string;
  breakingChanges?: string[];
  recommended: boolean;
}

interface SecurityIssue {
  packageName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  cve?: string;
  recommendation: string;
}

interface CodeSuggestion {
  file: string;
  line?: number;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  category: 'import' | 'dependency' | 'performance' | 'security';
}

interface PerformanceTip {
  tip: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
}

interface FileInfo {
  name: string;
  content: string;
}

interface HelpResponse {
  explanation: string;
  suggestedActions: FileOperation[];
  codeExamples?: string[];
  resources?: string[];
}

interface FileOperation {
  type: 'create' | 'modify' | 'delete';
  file: string;
  content?: string;
  reason: string;
}

export class AIService {
  private apiKey: string = 'AIzaSyC8tzrhO0j2Sc4tHGIohNuItHcnWCB_peI';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor() {
    // Using the provided Gemini API key
  }

  async analyzeProject(dependencyData: any): Promise<AIAnalysisResult> {
    try {
      const workspacePath = process.cwd();
      return await this.analyzeProjectInternal(workspacePath, dependencyData);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }

  async handleHelpQuery(query: string): Promise<HelpResponse> {
    try {
      const workspacePath = process.cwd();
      const projectInfo = await this.gatherProjectInfo(workspacePath);
      
      const prompt = `You are Desk Buddy, an AI assistant that helps with code problems and project management. 
      
User Query: "${query}"

Project Context:
- Package.json: ${JSON.stringify(projectInfo.packageJson, null, 2)}
- Files: ${projectInfo.fileCount} total files
- Sample files: ${JSON.stringify(projectInfo.sampleFiles.slice(0, 5).map((f: FileInfo) => ({ name: f.name, content: f.content.substring(0, 300) + '...' })), null, 2)}

Please analyze the user's query and provide a helpful response. If the query suggests code issues, file problems, or improvements, suggest specific file operations.

Respond in JSON format:
{
  "explanation": "Clear explanation of the issue and solution",
  "suggestedActions": [
    {
      "type": "create|modify|delete",
      "file": "path/to/file",
      "content": "file content if creating/modifying",
      "reason": "why this change is needed"
    }
  ],
  "codeExamples": ["code example 1", "code example 2"],
  "resources": ["helpful link 1", "helpful link 2"]
}

Focus on:
1. Understanding the user's problem
2. Providing actionable solutions
3. Suggesting file operations when appropriate
4. Being helpful and concise`;

      const response = await this.callGeminiAPI(prompt);
      return this.parseHelpResponse(response);
    } catch (error) {
      console.error('Help query failed:', error);
      return {
        explanation: "I'm having trouble processing your request right now. Please try again later.",
        suggestedActions: [],
        codeExamples: [],
        resources: []
      };
    }
  }

  async executeFileOperations(operations: FileOperation[]): Promise<boolean> {
    try {
      for (const operation of operations) {
        console.log(`\n🔧 ${operation.type.toUpperCase()}: ${operation.file}`);
        console.log(`📝 Reason: ${operation.reason}`);
        
        switch (operation.type) {
          case 'create':
            if (operation.content) {
              await this.createFile(operation.file, operation.content);
            }
            break;
          case 'modify':
            if (operation.content) {
              await this.modifyFile(operation.file, operation.content);
            }
            break;
          case 'delete':
            await this.deleteFile(operation.file);
            break;
        }
      }
      return true;
    } catch (error) {
      console.error('File operations failed:', error);
      return false;
    }
  }

  private async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
  }

  private async modifyFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    if (await fs.pathExists(fullPath)) {
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`✅ Modified: ${filePath}`);
    } else {
      console.log(`⚠️  File not found, creating: ${filePath}`);
      await this.createFile(filePath, content);
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
      console.log(`✅ Deleted: ${filePath}`);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  }

  private parseHelpResponse(response: string): HelpResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse help response:', error);
    }
    
    return {
      explanation: response || "I couldn't process your request properly. Please try rephrasing your question.",
      suggestedActions: [],
      codeExamples: [],
      resources: []
    };
  }

  async analyzeSecurity(securityIssues: any[]): Promise<any> {
    try {
      const prompt = `Analyze these security issues and provide recommendations:

Security Issues: ${JSON.stringify(securityIssues, null, 2)}

Provide analysis in JSON format:
{
  "summary": "Overall security assessment",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      return {
        summary: 'Security analysis unavailable',
        recommendations: []
      };
    }
  }

  async enhanceCodeSuggestions(suggestions: any[]): Promise<any[]> {
    try {
      const prompt = `Enhance these code suggestions with AI insights:

Suggestions: ${JSON.stringify(suggestions, null, 2)}

Provide enhanced suggestions with better explanations and impact assessment.`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response) || suggestions;
    } catch (error) {
      return suggestions;
    }
  }

  async enhancePerformanceTips(tips: any[]): Promise<any[]> {
    try {
      const prompt = `Enhance these performance tips with AI insights:

Tips: ${JSON.stringify(tips, null, 2)}

Provide enhanced tips with better explanations and impact assessment.`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response) || tips;
    } catch (error) {
      return tips;
    }
  }

  async enhancePackageUpdates(updates: any[]): Promise<any[]> {
    try {
      const prompt = `Enhance these package updates with AI insights:

Updates: ${JSON.stringify(updates, null, 2)}

Provide enhanced updates with better recommendations and breaking change analysis.`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response) || updates;
    } catch (error) {
      return updates;
    }
  }

  async analyzeAlternatives(packageName: string, alternatives: string[]): Promise<any[]> {
    try {
      const prompt = `Analyze alternatives for ${packageName}:

Alternatives: ${alternatives.join(', ')}

Provide analysis in JSON format:
[
  {
    "name": "alternative-name",
    "rating": 4,
    "description": "Description",
    "pros": ["pro1", "pro2"],
    "cons": ["con1", "con2"]
  }
]`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response) || alternatives.map(alt => ({
        name: alt,
        rating: 3,
        description: 'Alternative package',
        pros: ['Alternative option'],
        cons: ['Limited information']
      }));
    } catch (error) {
      return alternatives.map(alt => ({
        name: alt,
        rating: 3,
        description: 'Alternative package',
        pros: ['Alternative option'],
        cons: ['Limited information']
      }));
    }
  }

  async getPackageInsight(packageName: string, issueType: string): Promise<any> {
    try {
      const prompt = `Provide AI insight for package ${packageName} with issue type ${issueType}.

Provide analysis in JSON format:
{
  "summary": "Brief summary",
  "recommendation": "Specific recommendation",
  "codeExample": "Code example if applicable"
}`;

      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response) || {
        summary: `Analysis for ${packageName} (${issueType})`,
        recommendation: 'Please check the package documentation.',
        codeExample: null
      };
    } catch (error) {
      return {
        summary: `Analysis for ${packageName} (${issueType})`,
        recommendation: 'Please check the package documentation.',
        codeExample: null
      };
    }
  }

  private async gatherProjectInfo(workspacePath: string) {
    try {
      const packageJsonPath = path.join(workspacePath, 'package.json');
      let packageJson = {};
      
      if (await fs.pathExists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
      }
      
      // Get file statistics
      const files = await glob('**/*.{js,ts,jsx,tsx,vue,php,py,java,go,rs,cpp,c,cs}', { 
        cwd: workspacePath, 
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'] 
      });

      // Sample some files for analysis
      const sampleFiles: FileInfo[] = [];
      for (const file of files.slice(0, 10)) {
        const content = await this.getFileContent(path.join(workspacePath, file));
        sampleFiles.push({ name: file, content });
      }

      return {
        packageJson,
        fileCount: files.length,
        sampleFiles,
        workspacePath
      };
    } catch (error) {
      return {
        packageJson: {},
        fileCount: 0,
        sampleFiles: [],
        workspacePath
      };
    }
  }

  private async getFileContent(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > 50000) { // Skip files larger than 50KB
        return '// File too large to analyze';
      }
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  private createAnalysisPrompt(projectInfo: any, dependencyResult: any): string {
    return `You are Desk Buddy, an expert software developer and package manager assistant. Analyze this project and provide intelligent recommendations.

PROJECT INFO:
- Package.json: ${JSON.stringify(projectInfo.packageJson, null, 2)}
- Total files: ${projectInfo.fileCount}
- Sample files: ${JSON.stringify(projectInfo.sampleFiles.map((f: FileInfo) => ({ name: f.name, content: f.content.substring(0, 500) })), null, 2)}

DEPENDENCY ANALYSIS:
- Missing: ${dependencyResult.missing.join(', ')}
- Not installed: ${dependencyResult.notInstalled.join(', ')}
- Unused: ${dependencyResult.unused.join(', ')}

Please provide a comprehensive analysis in the following JSON format:
{
  "packageUpdates": [
    {
      "packageName": "package-name",
      "currentVersion": "1.0.0",
      "latestVersion": "1.2.0",
      "updateType": "minor",
      "description": "Update description",
      "breakingChanges": ["breaking change 1"],
      "recommended": true
    }
  ],
  "securityIssues": [
    {
      "packageName": "vulnerable-package",
      "severity": "high",
      "description": "Security issue description",
      "cve": "CVE-2023-1234",
      "recommendation": "Update to version X"
    }
  ],
  "codeSuggestions": [
    {
      "file": "src/file.js",
      "line": 10,
      "suggestion": "Consider using dynamic import for better performance",
      "impact": "medium",
      "category": "performance"
    }
  ],
  "performanceTips": [
    {
      "tip": "Consider using tree-shaking to reduce bundle size",
      "impact": "high",
      "category": "bundle-optimization"
    }
  ],
  "summary": "Overall project health and recommendations"
}

Focus on:
1. Security vulnerabilities in dependencies
2. Performance optimizations
3. Modern JavaScript/TypeScript practices
4. Bundle size optimizations
5. Code quality improvements
6. Dependency management best practices

Provide actionable, specific recommendations.`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.candidates[0].content.parts[0].text;
  }

  private parseAIResponse(aiResponse: string): AIAnalysisResult {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    
    return this.getDefaultAnalysis();
  }

  private getDefaultAnalysis(): AIAnalysisResult {
    return {
      packageUpdates: [],
      securityIssues: [],
      codeSuggestions: [],
      performanceTips: [],
      summary: 'AI analysis unavailable. Please check your internet connection and API key.'
    };
  }

  async checkPackageVersions(packageNames: string[]): Promise<PackageUpdate[]> {
    try {
      const prompt = `Check the latest versions for these npm packages: ${packageNames.join(', ')}. 
      Return only a JSON array of package updates with current and latest versions.`;
      
      const response = await this.callGeminiAPI(prompt);
      const updates = JSON.parse(response);
      return updates || [];
    } catch (error) {
      console.error('Failed to check package versions:', error);
      return [];
    }
  }

  async suggestAlternatives(packageName: string): Promise<string[]> {
    try {
      const prompt = `Suggest 3 alternative npm packages to "${packageName}" that are more modern, maintained, or performant. Return only a JSON array of package names.`;
      
      const response = await this.callGeminiAPI(prompt);
      const alternatives = JSON.parse(response);
      return alternatives || [];
    } catch (error) {
      console.error('Failed to suggest alternatives:', error);
      return [];
    }
  }

  async analyzeProjectInternal(workspacePath: string, dependencyResult: any): Promise<AIAnalysisResult> {
    try {
      // Gather project information
      const projectInfo = await this.gatherProjectInfo(workspacePath);
      
      // Create AI prompt
      const prompt = this.createAnalysisPrompt(projectInfo, dependencyResult);
      
      // Get AI analysis
      const aiResponse = await this.callGeminiAPI(prompt);
      
      // Parse AI response
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }
} 