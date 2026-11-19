
async function testEvaluation() {
  try {
    const response = await fetch(
      "http://localhost:3004/api/evaluate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Fix Shopping Cart Calculations",

          description:
            "Fix the subtotal and tax calculations in a Java shopping cart.",

          instructions: [
            "Calculate the subtotal using item price and quantity.",
            "Apply a tax rate of 10%.",
            "Return the correct final total.",
          ],

          files: {
            "Cart.java": `
public class Cart {
    public double calculateSubtotal(
        double price, int quantity
    ) {
        return price;
    }

    public double calculateTotal(
        double subtotal
    ) {
        return subtotal * 10;
    }
}
`,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Status:", response.status);

    if (!response.ok) {
      console.log("Error:", data.error);
      return;
    }

    console.log(
      "Evaluation:",
      JSON.stringify(data.evaluation, null, 2)
    );

    console.log("Type:", data.evaluationType);
    console.log("Tests executed:", data.testsExecuted);
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testEvaluation();
