import React from 'react';
import { ArrowDown, Lightbulb, Target, Users, Trophy, FileImage, FileText } from 'lucide-react';

interface FlowchartData {
  session_name: string;
  iterative_prompt?: string;
  current_round: number;
  initial_ideas: Array<{content: string; author: string; votes: number}>;
  iterative_ideas: Array<{content: string; author: string; round: number; votes: number}>;
  themes: Record<string, {description: string; ideas: Array<{content: string; author: string; votes: number}>}>;
  final_idea?: {content: string; author: string; votes: number};
  total_ideas: number;
  generated_at: string;
}

interface IdeaFlowChartProps {
  flowchartData: FlowchartData;
  onClose: () => void;
}

const IdeaFlowChart: React.FC<IdeaFlowChartProps> = ({ flowchartData, onClose }) => {
  const { 
    session_name, 
    iterative_prompt, 
    initial_ideas, 
    iterative_ideas, 
    themes, 
    final_idea,
    total_ideas 
  } = flowchartData;

  // Parse iterative prompt if it's a JSON string
  let parsedPrompt = null;
  if (iterative_prompt) {
    try {
      // Try to parse if it's a JSON string
      if (typeof iterative_prompt === 'string' && iterative_prompt.startsWith('{')) {
        const parsed = JSON.parse(iterative_prompt.replace(/'/g, '"'));
        parsedPrompt = parsed.selected_ideas?.[0]?.content || 'Selected ideas for deeper exploration';
      } else {
        parsedPrompt = iterative_prompt;
      }
    } catch (error) {
      parsedPrompt = iterative_prompt;
    }
  }

  // Export functionality
  const exportAsImage = async () => {
    const element = document.getElementById('flowchart-content');
    if (!element) return;

    try {
      // Use html2canvas to capture the flowchart
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `${session_name.replace(/\s+/g, '_')}_flowchart.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting as image:', error);
    }
  };

  const exportAsPDF = async () => {
    const element = document.getElementById('flowchart-content');
    if (!element) return;

    try {
      // Use html2canvas and jsPDF to create PDF
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${session_name.replace(/\s+/g, '_')}_flowchart.pdf`);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-red-900">
            Ideation Flow: {session_name}
          </h2>
          <div className="flex items-center space-x-3">
            {/* Export buttons */}
            <button
              onClick={exportAsImage}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-red rounded-lg hover:bg-blue-700"
              title="Export as PNG"
            >
              <FileImage className="w-4 h-4" />
              <span className="text-sm">PNG</span>
            </button>
            <button
              onClick={exportAsPDF}
              className="flex items-center space-x-2 px-3 py-2 bg-white-600 text-blue rounded-lg hover:bg-green-700 transition-colors"
              title="Export as PDF"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-semibold"
            >
              ×
            </button>
          </div>
        </div>

        <div id="flowchart-content" className="p-6">
          {/* Overview Stats */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Journey Summary</span>
              </div>
              <div className="text-sm text-blue-700">
                {total_ideas} total ideas • {Object.keys(themes).length} themes generated
              </div>
            </div>
          </div>

          {/* Flowchart Visual */}
          <div className="space-y-8">
            
            {/* Step 1: Initial Ideas */}
            <div className="text-center">
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Initial Brainstorming</h3>
                </div>
                <p className="text-sm text-green-700">{initial_ideas.length} ideas submitted</p>
              </div>
              
              {/* Show top initial ideas */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                {initial_ideas.slice(0, 6).map((idea, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <div className="font-medium text-green-900 mb-1">💡 {idea.content.substring(0, 60)}...</div>
                    <div className="text-green-600 text-xs flex items-center justify-between">
                      <span>by {idea.author}</span>
                      <span>{idea.votes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="w-8 h-8 text-gray-400" />
            </div>

            {/* Step 2: Prompts (if iterative session) */}
            {iterative_prompt && (
              <>
                <div className="text-center">
                  <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Target className="w-5 h-5 text-yellow-600" />
                      <h3 className="font-semibold text-yellow-900">Focused Prompt</h3>
                    </div>
                    <p className="text-sm text-yellow-700">Ideas refined with specific direction</p>
                  </div>
                  
                  {/* Show the iterative prompt */}
                  <div className="mt-4 max-w-2xl mx-auto">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-900 font-medium">{parsedPrompt || 'Focus on selected ideas for deeper exploration'}</p>
                    </div>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArrowDown className="w-8 h-8 text-gray-400" />
                </div>

                {/* Step 3: Refined Ideas */}
                {iterative_ideas.length > 0 && (
                  <>
                    <div className="text-center">
                      <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4 max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <Lightbulb className="w-5 h-5 text-purple-600" />
                          <h3 className="font-semibold text-purple-900">Refined Ideas</h3>
                        </div>
                        <p className="text-sm text-purple-700">{iterative_ideas.length} focused solutions</p>
                      </div>
                      
                      {/* Show refined ideas */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                        {iterative_ideas.slice(0, 4).map((idea, index) => (
                          <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                            <div className="font-medium text-purple-900 mb-1">🚀 {idea.content.substring(0, 60)}...</div>
                            <div className="text-purple-600 text-xs flex items-center justify-between">
                              <span>by {idea.author}</span>
                              <span>{idea.votes} votes</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center">
                      <ArrowDown className="w-8 h-8 text-gray-400" />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Step 4: AI Themes */}
            {Object.keys(themes).length > 0 && (
              <>
                <div className="text-center">
                  <div className="bg-indigo-100 border-2 border-indigo-300 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                      <h3 className="font-semibold text-indigo-900">Theme Analysis</h3>
                    </div>
                    <p className="text-sm text-indigo-700">{Object.keys(themes).length} themes identified</p>
                  </div>
                  
                  {/* Show themes */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                    {Object.entries(themes).map(([themeName, themeData], index) => (
                      <div key={index} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-semibold text-indigo-900 mb-2">🎯 {themeName}</h4>
                        <p className="text-indigo-700 text-sm mb-3">{themeData.description}</p>
                        <div className="space-y-1">
                          {themeData.ideas.slice(0, 2).map((idea, idx) => (
                            <div key={idx} className="text-xs text-indigo-600 bg-white rounded px-2 py-1">
                              {idea.content.substring(0, 50)}... ({idea.votes} votes)
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArrowDown className="w-8 h-8 text-gray-400" />
                </div>
              </>
            )}

            {/* Step 5: Final Selection */}
            {final_idea && (
              <div className="text-center">
                <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg p-6 max-w-lg mx-auto">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Trophy className="w-6 h-6 text-orange-600" />
                    <h3 className="font-bold text-orange-900 text-lg">Top Selected Idea</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <p className="text-gray-900 font-medium mb-2">{final_idea.content}</p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <span>by {final_idea.author}</span>
                      <span className="font-semibold text-orange-600">{final_idea.votes} votes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Flowchart generated on {new Date(flowchartData.generated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaFlowChart;