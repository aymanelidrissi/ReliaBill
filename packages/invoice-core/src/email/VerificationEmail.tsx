import {
  Html,
  Body,
  Container,
  Section,
  Text,
  Button,
} from '@react-email/components';

export interface VerificationEmailProps {
  magicLink: string;
}

export default function VerificationEmail({
  magicLink,
}: VerificationEmailProps) {
  return (
    <Html>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto my-8 max-w-md">
          <Section className="rounded-2xl bg-white p-6 shadow-lg">
            <Text className="text-lg font-semibold text-center">
              Your ReliaBill sign-in link
            </Text>

            <Button
              href={magicLink}
              className="mt-6 block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-white hover:bg-blue-700"
            >
              Sign in
            </Button>

            <Text className="mt-4 text-center text-sm text-gray-500">
              Link expires in 30 minutes
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
