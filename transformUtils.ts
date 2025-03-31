// src/util/transformUtils.ts

// Define RequestResponse interface
export interface RequestResponse {
  sentiment: string;
  header: string;
  answer: string;
  buttons: any[];
  data: any[];
  footer: string;
}

// Define ButtonData and TransformedButton interfaces
export interface ButtonData {
  id: string;
  title: string;
}

export interface TransformedButton {
  type: string;
  reply: {
    id: string;
    title: string;
  };
}

// Function to transform button data
export function transformButton(button_type: string, button_data: ButtonData[]): TransformedButton[] {
  return button_data.map(button => ({
    type: button_type,
    reply: {
      id: button.id,
      title: button.title,
    }
  }));
}

// Define BodyStructure interface
export interface BodyStructure {
  body: {
    question: string;
  };
}

// Function to transform RequestResponse to BodyStructure
export function transformToBody(requestResponse: RequestResponse): BodyStructure {
  return {
    body: {
      question: requestResponse.answer,
    },
  };
}
