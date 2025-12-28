import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

const refactorCode = catchAsync(async (req, res, next) => {
  const { code, codeSmell } = req.body;

  // Validate input
  if (!code) {
    return next(new AppError("Code is required.", 400));
  }

  if (!codeSmell || typeof codeSmell !== "string") {
    return next(new AppError("Code smell name is required.", 400));
  }

  // Validate API key
  if (!process.env.AI_MODEL_ACCESS_KEY) {
    return next(
      new AppError(
        "AI Model access key is not configured in environment variables.",
        500
      )
    );
  }

  // Check if the code smell is Feature Envy - handle it differently
  const isFeatureEnvy = codeSmell.toLowerCase().includes("feature envy");

  // Create comprehensive prompt for AI
  let prompt;

  if (isFeatureEnvy) {
    prompt = `You are an expert software engineer specializing in code refactoring and clean code principles.

I have a piece of code with the "Feature Envy" code smell that needs to be analyzed:

ORIGINAL CODE:
\`\`\`
${code}
\`\`\`

TASK:
Analyze this code to identify the Feature Envy smell. Feature Envy occurs when a method uses more features (methods/fields) of another class than its own class.

Please:
1. Identify which method(s) have Feature Envy
2. Identify which class the method is "envious" of (the class whose features it uses the most)
3. Return the ORIGINAL code with detailed comments explaining:
   - Which method should be moved
   - Which class it should be moved to
   - Why this move would eliminate the Feature Envy smell
   - Any parameters that might need to be adjusted after the move

Add comments using this format:
// FEATURE ENVY DETECTED: [method name]
// SUGGESTION: Move this method to [target class name]
// REASON: This method accesses [list of fields/methods] from [target class] more than its own class
// AFTER MOVE: [any adjustments needed]

Return the original code WITH these analysis comments. Wrap the code in a code block.`;
  } else {
    prompt = `You are an expert software engineer specializing in code refactoring and clean code principles.

I have a piece of code with the following code smell that needs to be fixed:

CODE SMELL: ${codeSmell}

ORIGINAL CODE:
\`\`\`
${code}
\`\`\`

TASK:
Please refactor this code to eliminate the "${codeSmell}" code smell while maintaining the original functionality. Follow these guidelines:
1. Remove or fix the identified code smell
2. Apply best practices and design patterns where appropriate
3. Improve code readability and maintainability
4. Add meaningful comments only where necessary
5. Preserve the original logic and behavior
6. Use proper naming conventions
7. Optimize code structure without over-engineering

Please provide ONLY the refactored code without explanations. Wrap the code in a code block.`;
  }

  try {
    // Call AI API
    const url = "https://inference.do-ai.run/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_MODEL_ACCESS_KEY}`,
    };

    const data = {
      model: "openai-gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are an expert software engineer specializing in code refactoring. Provide clean, well-structured code that follows best practices.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.3, // Lower temperature for more consistent, focused refactoring
    };

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return next(
        new AppError(
          `AI API request failed: ${
            errorData.error?.message || response.statusText
          }`,
          response.status
        )
      );
    }

    const aiResponse = await response.json();

    // Extract refactored code from AI response
    const refactoredCode =
      aiResponse.choices?.[0]?.message?.content || "No response generated";

    // Clean up the response to extract just the code if wrapped in markdown
    let cleanedCode = refactoredCode;
    const codeBlockMatch = refactoredCode.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanedCode = codeBlockMatch[1].trim();
    }

    res.status(200).json({
      status: "success",
      data: {
        originalCode: code,
        refactoredCode: cleanedCode,
        rawResponse: refactoredCode,
        codeSmellAddressed: codeSmell,
        tokensUsed: aiResponse.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error("AI API Error:", error);
    return next(new AppError(`Failed to refactor code: ${error.message}`, 500));
  }
});

export { refactorCode };
