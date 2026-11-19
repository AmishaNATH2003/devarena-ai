
async function testInterviewFeedback() {
  try {
    const response = await fetch(
      "http://localhost:3004/api/interview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "answer",
          questionNumber: 1,
          assessment: {
            title: "Fix Shopping Cart Calculations",
            description:
              "Debug incorrect subtotal and tax calculations in a Java shopping cart.",
            codeSummary:
              "The Cart class calculates subtotal using item price and quantity, then adds 10% tax.",
          },
          question:
            "How did you debug the incorrect subtotal and tax calculations?",
          answer:
            "I noticed that the subtotal method was returning only the item price without multiplying by quantity. I changed it to price * quantity. I also found that the tax calculation was multiplying by 10 instead of applying a 10 percent tax, so I corrected it to subtotal * 1.10.",
          history: [],
        }),
      }
    );

    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testInterviewFeedback();
