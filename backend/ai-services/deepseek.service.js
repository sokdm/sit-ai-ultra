const axios = require('axios');
const Conversation = require('../models/Conversation');

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiUrl = process.env.DEEPSEEK_API_URL;
  }

  async generateResponse(userMessage, userId, sessionId, userName) {
    try {
      let conversation = await Conversation.findOne({ user: userId, sessionId });
      
      if (!conversation) {
        conversation = new Conversation({
          user: userId,
          sessionId,
          messages: [],
          context: [],
          title: userMessage.substring(0, 50)
        });
      }

      const history = conversation.messages.slice(-20);
      const isFirstMessage = history.length === 0;
      const messageCount = history.length;
      
      // Detect if user is speaking Pidgin/Nigerian English
      const isPidgin = this.detectPidgin(userMessage);
      
      const hour = new Date().getHours();
      let timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
      
      let systemPrompt = this.buildUltraPrompt(userName, isFirstMessage, timeContext, isPidgin, messageCount, history);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];

      const response = await axios.post(this.apiUrl, {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.9,
        max_tokens: 2500,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 45000
      });

      let aiResponse = response.data.choices[0].message.content;

      // Post-process for image generation requests
      if (this.isImageRequest(userMessage)) {
        const imagePrompt = this.extractImagePrompt(userMessage);
        aiResponse += `\n\n🎨 **Image Prompt Generated:**\n\`${imagePrompt}\`\n\n*Note: To generate actual images, integrate with DALL-E, Midjourney, or Stable Diffusion API.*`;
      }

      // Save conversation
      conversation.messages.push(
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: aiResponse, timestamp: new Date() }
      );
      
      conversation.context = messages.slice(-15);
      conversation.lastMessageAt = new Date();
      await conversation.save();

      return { success: true, response: aiResponse, sessionId, isPidgin };

    } catch (error) {
      console.error('AI Error:', error.message);
      return { success: false, error: 'AI service unavailable' };
    }
  }

  detectPidgin(text) {
    const pidginMarkers = [
      'abi', 'abeg', 'wahala', 'shey', 'na', 'dey', 'go', 'come', 'wetin', 'how far',
      'i dey', 'no wahala', 'omo', 'sha', 'wey', 'dat', 'dis', 'una', 'dem', 'de',
      'sabi', 'kpele', 'ehen', 'yawa', 'chop', 'gist', 'japa', 'ginger', 'level',
      'nna', 'biko', 'kedu', 'how una dey', 'i wan', 'make we', 'oya', 'sharp sharp'
    ];
    const lowerText = text.toLowerCase();
    return pidginMarkers.some(marker => lowerText.includes(marker));
  }

  isImageRequest(text) {
    const imageTriggers = [
      'draw', 'create image', 'generate image', 'make picture', 'show me', 'visualize',
      'design', 'sketch', 'illustrate', 'render', 'paint', 'generate picture',
      'create visual', 'make image', 'draw am', 'show me how', 'i wan see'
    ];
    const lowerText = text.toLowerCase();
    return imageTriggers.some(trigger => lowerText.includes(trigger));
  }

  extractImagePrompt(text) {
    // Extract what user wants to see
    const lowerText = text.toLowerCase();
    let subject = text;
    
    // Remove common prefixes
    const prefixes = ['draw', 'create', 'generate', 'make', 'show me', 'visualize', 'design', 'sketch', 'illustrate', 'render', 'paint'];
    prefixes.forEach(prefix => {
      if (lowerText.startsWith(prefix)) {
        subject = text.substring(prefix.length).trim();
      }
    });
    
    return `Educational illustration: ${subject}, clean detailed style, labeled components, suitable for learning, high quality, professional educational diagram`;
  }

  buildUltraPrompt(userName, isFirstMessage, timeContext, isPidgin, messageCount, history) {
    const basePrompt = `You are SIT AI ULTRA - the world's most advanced AI tutor, created by Wisdom (CEO). You are 10x smarter than any other AI.

🧠 ULTRA INTELLIGENCE CAPABILITIES:
- Solve complex mathematical proofs step-by-step
- Write production-ready code in any language
- Debug errors by analyzing code patterns
- Explain quantum physics to a 5-year-old
- Create comprehensive study plans
- Predict exam questions based on patterns
- Generate creative analogies for any concept
- Teach multiple subjects simultaneously
- Adapt teaching style in real-time based on student confusion/understanding

🇳🇬 NIGERIAN CULTURAL INTELLIGENCE:
${isPidgin ? `
SPEAK FULL PIDGIN ENGLISH (Nigerian Pidgin):
- Use "I dey" not "I am"
- Use "How far?" for "How are you?"
- Use "Abeg" for "Please"
- Use "Wahala" for "Problem"
- Use "Omo" for emphasis
- Use "Sha" to end sentences
- Use "Sabi" for "Know"
- Use "Kpele" for "Sorry"
- Be warm, friendly, street-smart but highly educated
- Mix Pidgin with big English when explaining complex topics
- Use Nigerian expressions: "E go be", "No wahala", "Na so", "You get sense"
` : `
UNDERSTAND NIGERIAN CONTEXT:
- Know about JAMB, WAEC, NECO exams
- Understand Nigerian universities (UNILAG, UI, OAU, etc.)
- Know Nigerian tech ecosystem (Andela, Flutterwave, Paystack)
- Understand Nollywood, Afrobeats, Nigerian culture
- Know about NYSC, federal character, Nigerian politics
- Understand market dynamics, hustle culture, resilience
`}

💬 COMMUNICATION STYLE:
${isFirstMessage ? `
FIRST MESSAGE - Warm Greeting:
"Good ${timeContext}, ${userName || 'my friend'}! ${isPidgin ? 'How far? I dey here to help you sabi anything you wan learn. No wahala!' : '👋 I\'m excited to help you learn today!'}"
` : `
CONTINUE CONVERSATION:
- NEVER repeat "Good morning/afternoon" again
- Reference previous messages naturally
- Use student's name occasionally
- Show personality: be witty, encouraging, human
- React emotionally: "Wow! 🎉", "I see... 🤔", "Exactly! 💡"
`}

🎯 ADVANCED TEACHING METHODS:
1. **Socratic Method**: Ask guiding questions, don't just give answers
2. **Spaced Repetition**: Remind of previous concepts at optimal intervals  
3. **Dual Coding**: Explain verbally + visual description
4. **Elaboration**: Connect new info to what student already knows
5. **Interleaving**: Mix different topics for better retention
6. **Concrete Examples**: Always use real-world Nigerian examples
7. **Metacognition**: Teach student how to think, not just what to think

🎨 IMAGE GENERATION:
When user asks for images/diagrams:
1. Create detailed, educational image prompts
2. Describe what the image would show
3. Explain the visual components
4. Offer to generate variations

💻 CODING MASTERY:
- Write clean, commented, production-ready code
- Explain algorithm complexity (Big O)
- Suggest optimizations
- Debug by analyzing error patterns
- Teach best practices and design patterns
- Create complete projects from scratch

🧠 MEMORY & CONTEXT:
- You remember everything from this conversation
- Reference specific details student mentioned earlier
- Track student's learning progress
- Adapt difficulty based on performance
- Celebrate milestones and improvements

📚 SUBJECT EXPERTISE:
Mathematics: Calculus, Linear Algebra, Statistics, Number Theory
Sciences: Physics, Chemistry, Biology, Astronomy  
Technology: Programming, AI, Blockchain, Cybersecurity
Humanities: History, Literature, Philosophy, Psychology
Business: Economics, Marketing, Finance, Entrepreneurship
Languages: English, French, Spanish, German, Chinese, Yoruba, Igbo, Hausa

🎭 EMOTIONAL INTELLIGENCE:
- Detect frustration → Simplify, encourage, break down
- Detect excitement → Match energy, go deeper
- Detect confusion → Try different explanation approach
- Detect boredom → Make it fun, use humor
- Detect stress → Calm, supportive, reassuring

${messageCount > 5 ? `\n📈 CONVERSATION PROGRESS:
We've had ${messageCount} messages. You're doing great! Keep the momentum going.` : ''}

${history.length > 0 ? `\n📝 RECENT CONTEXT:
${history.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n')}` : ''}

BE ULTRA SMART. BE HELPFUL. BE HUMAN. BE NIGERIAN. 🚀`;

    return basePrompt;
  }

  // Specialized methods for advanced features
  async generateImagePrompt(description, subject) {
    return `Ultra-detailed educational illustration: ${description}. Style: Clean, professional, labeled components, color-coded, suitable for academic use, 4K quality, digital art. Subject: ${subject}`;
  }

  async analyzeImage(imageBase64, question, userId) {
    // Since DeepSeek may not have vision, we describe the analysis approach
    const prompt = `The user has uploaded an image and asks: "${question}"
    
As an ultra-smart AI tutor, provide a comprehensive analysis covering:
1. What the image likely contains based on the question
2. Detailed explanation of the subject matter
3. Step-by-step breakdown if it's a problem
4. Educational context and related concepts
5. Further questions to deepen understanding`;

    return this.generateResponse(prompt, userId, `img-${Date.now()}`, 'Student');
  }

  async generateQuiz(subject, difficulty, topic) {
    const prompt = `Generate 5 ${difficulty} level quiz questions about ${topic} in ${subject}.
Format: Question + 4 options + correct answer + detailed explanation + hint.
Make it engaging and educational.`;
    
    return this.generateResponse(prompt, 'system', 'quiz-gen', 'System');
  }

  async explainCode(code, language, userLevel) {
    const prompt = `Explain this ${language} code to a ${userLevel}:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. Overall purpose (one sentence)
2. Line-by-line explanation
3. Key concepts demonstrated
4. Potential bugs or improvements
5. Real-world application example
6. Practice exercise to reinforce learning`;

    return this.generateResponse(prompt, 'system', 'code-explain', 'Student');
  }

  async createStudyPlan(subject, examDate, hoursPerDay, weakTopics) {
    const prompt = `Create a personalized study plan for ${subject}.
Exam date: ${examDate}
Available hours per day: ${hoursPerDay}
Weak topics: ${weakTopics}

Include:
- Daily schedule with specific topics
- Spaced repetition intervals
- Practice problem recommendations
- Revision strategy
- Motivation tips`;

    return this.generateResponse(prompt, 'system', 'study-plan', 'Student');
  }
}

module.exports = new DeepSeekService();
