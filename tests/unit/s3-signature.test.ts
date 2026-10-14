import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signV4, uriEncode } from "@/server/storage/s3";

/**
 * Vecteur officiel AWS (« Signature Calculations for the Authorization Header », exemple GET Object) :
 * clés d'exemple publiques, date 20130524T000000Z, bucket examplebucket, GET /test.txt avec Range.
 */
describe("signature AWS SigV4", () => {
  const input = {
    method: "GET",
    url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
    headers: { host: "examplebucket.s3.amazonaws.com", range: "bytes=0-9" },
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    date: new Date("2013-05-24T00:00:00Z"),
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };

  it("reproduit la requête canonique et la signature du vecteur de test AWS", () => {
    const signed = signV4(input);
    expect(createHash("sha256").update(signed.canonicalRequest).digest("hex")).toBe("7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972");
    expect(signed.signature).toBe("f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
    expect(signed.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("encode les clés d'objet selon la RFC 3986", () => {
    expect(uriEncode("users/abc/fichier (1).pdf", true)).toBe("users/abc/fichier%20%281%29.pdf");
    expect(uriEncode("a b+c*d")).toBe("a%20b%2Bc%2Ad");
  });
});
