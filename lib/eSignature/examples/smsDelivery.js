/**
 * @file
 * Example 037: Remote signer, cc, envelope has three documents
 * @author DocuSign
 */

const fs = require("fs-extra");
const docusign = require("docusign-esign");

/**
 * This function does the work of creating the envelope
 */
const smsDelivery = async (args) => {
  // Data for this method
  // args.basePath
  // args.accessToken
  // args.accountId

  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(args.basePath);
  dsApiClient.addDefaultHeader("Authorization", "Bearer " + args.accessToken);
  let envelopesApi = new docusign.EnvelopesApi(dsApiClient),
    results = null;

  // Make the envelope request body
  let envelope = makeEnvelope(args.envelopeArgs);

  // call Envelopes::create API method
  // Exceptions will be caught by the calling function
  // Step 3 start
  results = await envelopesApi.createEnvelope(args.accountId, {
    envelopeDefinition: envelope,
  });
  // Step 3 end  
  let envelopeId = results.envelopeId;

  console.log(`Envelope was created. EnvelopeId ${envelopeId}`);
  return { envelopeId: envelopeId };
};

/**
 * Creates envelope
 * @function
 * @param {Object} args parameters for the envelope
 * @returns {Envelope} An envelope definition
 * @private
 */
// Step 2 start
function makeEnvelope(args) {
  // Data for this method
  // args.signerName
  // args.phoneNumber
  // args.countryCode
  // args.ccName
  // args.ccPhoneNumber
  // args.ccCountryCode
  // args.status
  // doc2File
  // doc3File

  // document 1 (html) has tag **signature_1**
  // document 2 (docx) has tag /sn1/
  // document 3 (pdf) has tag /sn1/
  //
  // The envelope has two recipients.
  // recipient 1 - signer
  // recipient 2 - cc
  // The envelope will be sent first to the signer.
  // After it is signed, a copy is sent to the cc person.

  let doc2DocxBytes, doc3PdfBytes;
  // read files from a local directory
  // The reads could raise an exception if the file is not available!
  doc2DocxBytes = fs.readFileSync(args.doc2File);
  doc3PdfBytes = fs.readFileSync(args.doc3File);

  // create the envelope definition
  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = "Please sign this document set";

  // add the documents
  let doc1 = new docusign.Document(),
    doc1b64 = Buffer.from(document1(args)).toString("base64"),
    doc2b64 = Buffer.from(doc2DocxBytes).toString("base64"),
    doc3b64 = Buffer.from(doc3PdfBytes).toString("base64");
  doc1.documentBase64 = doc1b64;
  doc1.name = "Order acknowledgement"; // can be different from actual file name
  doc1.fileExtension = "html"; // Source data format. Signed docs are always pdf.
  doc1.documentId = "1"; // a label used to reference the doc

  // Alternate pattern: using constructors for docs 2 and 3...
  let doc2 = new docusign.Document.constructFromObject({
    documentBase64: doc2b64,
    name: "Battle Plan", // can be different from actual file name
    fileExtension: "docx",
    documentId: "2",
  });

  let doc3 = new docusign.Document.constructFromObject({
    documentBase64: doc3b64,
    name: "Lorem Ipsum", // can be different from actual file name
    fileExtension: "pdf",
    documentId: "3",
  });

  // The order in the docs array determines the order in the envelope
  env.documents = [doc1, doc2, doc3];

  // Create a RecipientPhoneNumber object for the signer's phone number
  let signerPhoneNumber = docusign.RecipientPhoneNumber.constructFromObject({
    countryCode: args.countryCode,
    number: args.phoneNumber,
  });

  // Create a signer recipient to sign the document, identified by name and phone number
  // We're setting the parameters via the object constructor
  let signer1 = docusign.Signer.constructFromObject({
    name: args.signerName,
    phoneNumber: signerPhoneNumber,
    deliveryMethod: "SMS",
    recipientId: "1",
    routingOrder: "1",
  });
  
  // routingOrder (lower means earlier) determines the order of deliveries
  // to the recipients. Parallel routing order is supported by using the
  // same integer as the order for two or more recipients.

  // Create a RecipientPhoneNumber object for the signer's phone number
  let ccPhoneNumber = docusign.RecipientPhoneNumber.constructFromObject({
    countryCode: args.ccCountryCode,
    number: args.ccPhoneNumber,
  });

  // Create a cc recipient to receive a copy of the documents, identified by name and phone number
  // We're setting the parameters via setters
  let cc1 = new docusign.CarbonCopy();
  cc1.name = args.ccName;
  cc1.routingOrder = "2";
  cc1.recipientId = "2";
  cc1.deliveryMethod = "SMS";
  cc1.phoneNumber = ccPhoneNumber;

  // Create signHere fields (also known as tabs) on the documents,
  // We're using anchor (autoPlace) positioning
  //
  // The DocuSign platform searches throughout your envelope's
  // documents for matching anchor strings. So the
  // signHere2 tab will be used in both document 2 and 3 since they
  // use the same anchor string for their "signer 1" tabs.
  let signHere1 = docusign.SignHere.constructFromObject({
      anchorString: "**signature_1**",
      anchorYOffset: "10",
      anchorUnits: "pixels",
      anchorXOffset: "20",
    }),
    signHere2 = docusign.SignHere.constructFromObject({
      anchorString: "/sn1/",
      anchorYOffset: "10",
      anchorUnits: "pixels",
      anchorXOffset: "20",
    });
  // Tabs are set per recipient / signer
  let signer1Tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere1, signHere2],
  });
  signer1.tabs = signer1Tabs;

  // Add the recipients to the envelope object
  let recipients = docusign.Recipients.constructFromObject({
    signers: [signer1],
    carbonCopies: [cc1],
  });
  env.recipients = recipients;

  // Request that the envelope be sent by setting |status| to "sent".
  // To request that the envelope be created as a draft, set to "created"
  env.status = args.status;

  return env;
}

/**
 * Creates document 1
 * @function
 * @private
 * @param {Object} args parameters for the envelope
 * @returns {string} A document in HTML format
 */

function document1(args) {
  // Data for this method
  // args.signerName
  // args.ccName

  return `
    <!DOCTYPE html>
    <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family:sans-serif;margin-left:2em;">
        <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;
            color: darkblue;margin-bottom: 0;">World Wide Corp</h1>
        <h2 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;
          margin-top: 0px;margin-bottom: 3.5em;font-size: 1em;
          color: darkblue;">Order Processing Division</h2>
        <h4>Ordered by ${args.signerName}</h4>
        <p style="margin-top:0em; margin-bottom:0em;">Phone number: ${args.phoneNumber}</p>
        <p style="margin-top:0em; margin-bottom:0em;">Copy to: ${args.ccName}, ${args.ccPhoneNumber}</p>
        <p style="margin-top:3em;">
  Candy bonbon pastry jujubes lollipop wafer biscuit biscuit. Topping brownie sesame snaps sweet roll pie. Croissant danish biscuit soufflé caramels jujubes jelly. Dragée danish caramels lemon drops dragée. Gummi bears cupcake biscuit tiramisu sugar plum pastry. Dragée gummies applicake pudding liquorice. Donut jujubes oat cake jelly-o. Dessert bear claw chocolate cake gummies lollipop sugar plum ice cream gummies cheesecake.
        </p>
        <!-- Note the anchor tag for the signature field is in white. -->
        <h3 style="margin-top:3em;">Agreed: <span style="color:white;">**signature_1**/</span></h3>
        </body>
    </html>
  `;
}
// Step 2 end 
module.exports = { smsDelivery };
