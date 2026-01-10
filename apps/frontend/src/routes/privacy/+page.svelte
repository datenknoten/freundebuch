<svelte:head>
	<title>Privacy Policy | Freundebuch</title>
</svelte:head>

<div class="bg-gray-50 min-h-screen py-12">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="bg-white rounded-xl shadow-lg p-8">
			<h1 class="text-4xl font-heading text-forest mb-8">Privacy Policy</h1>

			<div class="prose prose-gray max-w-none font-body space-y-6">
				<p class="text-gray-600">
					Last updated: January 2026
				</p>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">1. Introduction</h2>
					<p class="text-gray-700">
						Welcome to Freundebuch. We respect your privacy and are committed to protecting your personal data
						in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
						This privacy policy explains how we collect, use, and safeguard your information when you use our
						relationship management application.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">2. Data Controller</h2>
					<p class="text-gray-700">
						The data controller responsible for your personal data is the operator of this Freundebuch instance.
						For self-hosted installations, the individual or organization hosting the application acts as the data controller.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">3. Data We Collect</h2>
					<p class="text-gray-700">We collect the following types of information:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Account Information:</strong> Email address and password (encrypted using industry-standard hashing) when you create an account</li>
						<li><strong>Contact Data:</strong> Information about your contacts that you choose to store, including names, birthdays, addresses, notes, and other personal details</li>
						<li><strong>Technical Data:</strong> IP address, browser type and version, operating system, device information, and timezone</li>
						<li><strong>Usage Data:</strong> Information about how you interact with the application, including pages visited, features used, and interaction patterns</li>
						<li><strong>Error and Performance Data:</strong> Technical information when errors occur, including stack traces, performance metrics, and diagnostic data (see Section 7)</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">4. Legal Basis for Processing</h2>
					<p class="text-gray-700">We process your personal data based on the following legal grounds under GDPR:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Contract Performance (Art. 6(1)(b) GDPR):</strong> Processing necessary to provide the Freundebuch service, including account management and storing your contact data</li>
						<li><strong>Legitimate Interest (Art. 6(1)(f) GDPR):</strong> Error monitoring and performance optimization to ensure service reliability and security. Our legitimate interest is balanced against your privacy rights through data minimization and anonymization where possible</li>
						<li><strong>Consent (Art. 6(1)(a) GDPR):</strong> For optional features such as session replay recordings, which you can opt out of</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">5. How We Use Your Data</h2>
					<p class="text-gray-700">Your data is used to:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li>Provide and maintain the Freundebuch service</li>
						<li>Store and display your contact information</li>
						<li>Send reminders about birthdays and other important dates (if enabled)</li>
						<li>Monitor and fix errors to ensure service reliability</li>
						<li>Analyze performance and optimize the application</li>
						<li>Communicate with you about service updates</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">6. Data Storage and Security</h2>
					<p class="text-gray-700">
						Freundebuch is designed to be self-hosted, giving you full control over your data. When self-hosted:
					</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li>Your data is stored on your own servers or infrastructure</li>
						<li>You are responsible for the security of your deployment</li>
						<li>The hosting party determines additional data protection measures</li>
					</ul>
					<p class="text-gray-700 mt-4">
						We implement industry-standard security measures including encrypted passwords (using bcrypt hashing),
						secure authentication tokens, and HTTPS encryption for data in transit.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">7. Error Monitoring and Session Replay (Sentry)</h2>
					<p class="text-gray-700">
						We use <strong>Sentry</strong>, a third-party error monitoring service provided by Functional Software, Inc.,
						to help us identify and fix technical issues. This is essential for maintaining a reliable service.
					</p>

					<h3 class="text-xl font-heading text-gray-800 mt-6 mb-3">What Sentry Collects</h3>
					<ul class="list-disc pl-6 text-gray-700 space-y-2">
						<li><strong>Error Reports:</strong> When an error occurs, we collect stack traces, error messages, and the state of the application at the time of the error</li>
						<li><strong>Performance Data:</strong> Page load times, API response times, and other performance metrics</li>
						<li><strong>Device Information:</strong> Browser type, operating system, screen resolution, and device type</li>
						<li><strong>Session Replay:</strong> Visual recordings of user sessions to help debug issues. This may include mouse movements, clicks, scrolls, and page content. Sensitive data (passwords, personal data) is masked automatically</li>
					</ul>

					<h3 class="text-xl font-heading text-gray-800 mt-6 mb-3">Session Replay Details</h3>
					<p class="text-gray-700">
						Session Replay records approximately <strong>10% of normal user sessions</strong> and <strong>100% of sessions where an error occurs</strong>.
						These recordings help us understand how errors happen and improve the user experience. The recordings:
					</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li>Automatically mask password fields and other sensitive inputs</li>
						<li>Do not capture keystrokes in password fields</li>
						<li>Are stored securely by Sentry and deleted according to their retention policy</li>
					</ul>

					<h3 class="text-xl font-heading text-gray-800 mt-6 mb-3">Sentry Data Processing</h3>
					<p class="text-gray-700">
						Sentry acts as a data processor on our behalf. Sentry is based in the United States and is certified under
						the EU-U.S. Data Privacy Framework. For more information, see
						<a href="https://sentry.io/privacy/" class="text-forest hover:text-forest-light" target="_blank" rel="noopener noreferrer">Sentry's Privacy Policy</a>.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">8. International Data Transfers</h2>
					<p class="text-gray-700">
						When using Sentry for error monitoring, your data may be transferred to and processed in the United States.
						These transfers are protected by:
					</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li>The EU-U.S. Data Privacy Framework</li>
						<li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
						<li>Additional technical and organizational measures to ensure data protection</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">9. Data Sharing and Third-Party Processors</h2>
					<p class="text-gray-700">
						We do not sell, trade, or share your personal contact data with third parties for marketing purposes.
						We use the following third-party processors:
					</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Sentry (Functional Software, Inc.):</strong> Error monitoring and performance tracking (see Section 7)</li>
					</ul>
					<p class="text-gray-700 mt-4">
						Your contact information and personal notes remain private and are only accessible to you, unless you
						configure external sync services.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">10. CalDAV/CardDAV Sync</h2>
					<p class="text-gray-700">
						Freundebuch supports syncing with CalDAV and CardDAV services. When you enable sync:
					</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li>Contact data is transmitted to your configured sync server</li>
						<li>The privacy practices of third-party sync services are governed by their respective policies</li>
						<li>You have full control over which data is synced</li>
						<li>You are responsible for ensuring the sync provider meets your privacy requirements</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">11. Data Retention</h2>
					<p class="text-gray-700">We retain your data for the following periods:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Account and Contact Data:</strong> Retained until you delete your account or request deletion</li>
						<li><strong>Error and Performance Data (Sentry):</strong> Retained for 90 days, after which it is automatically deleted</li>
						<li><strong>Session Replay Recordings:</strong> Retained for 30 days by Sentry</li>
						<li><strong>Server Logs:</strong> Retained for 30 days for security and debugging purposes</li>
					</ul>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">12. Your Rights Under GDPR</h2>
					<p class="text-gray-700">Under the General Data Protection Regulation, you have the following rights:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Right of Access (Art. 15):</strong> Request a copy of all personal data we hold about you</li>
						<li><strong>Right to Rectification (Art. 16):</strong> Correct any inaccurate or incomplete data</li>
						<li><strong>Right to Erasure (Art. 17):</strong> Request deletion of your personal data ("right to be forgotten")</li>
						<li><strong>Right to Restrict Processing (Art. 18):</strong> Request limitation of how we process your data</li>
						<li><strong>Right to Data Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format (e.g., vCard export)</li>
						<li><strong>Right to Object (Art. 21):</strong> Object to processing based on legitimate interests</li>
						<li><strong>Right to Withdraw Consent (Art. 7):</strong> Withdraw consent at any time where processing is based on consent</li>
					</ul>
					<p class="text-gray-700 mt-4">
						To exercise these rights, please contact the operator of this Freundebuch instance or use the account
						settings to manage your data.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">13. Right to Lodge a Complaint</h2>
					<p class="text-gray-700">
						If you believe your data protection rights have been violated, you have the right to lodge a complaint
						with a supervisory authority. In the EU, you can contact the data protection authority in your country
						of residence, place of work, or where the alleged infringement occurred.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">14. Cookies and Local Storage</h2>
					<p class="text-gray-700">Freundebuch uses the following technologies:</p>
					<ul class="list-disc pl-6 text-gray-700 space-y-2 mt-3">
						<li><strong>Essential Cookies:</strong> Required for authentication and session management. These cannot be disabled as they are necessary for the service to function</li>
						<li><strong>Local Storage:</strong> Used to store your preferences and session data locally in your browser</li>
						<li><strong>Sentry SDK:</strong> May store identifiers to correlate error reports and session replays</li>
					</ul>
					<p class="text-gray-700 mt-4">
						We do not use third-party advertising or marketing cookies.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">15. Children's Privacy</h2>
					<p class="text-gray-700">
						Freundebuch is not intended for use by children under the age of 16. We do not knowingly collect
						personal data from children. If you believe we have collected data from a child, please contact us
						immediately so we can delete it.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">16. Changes to This Policy</h2>
					<p class="text-gray-700">
						We may update this privacy policy from time to time. We will notify you of any significant changes by
						posting the new policy on this page, updating the "Last updated" date, and where appropriate, notifying
						you via email. We encourage you to review this policy periodically.
					</p>
				</section>

				<section>
					<h2 class="text-2xl font-heading text-gray-800 mt-8 mb-4">17. Contact Us</h2>
					<p class="text-gray-700">
						If you have any questions about this privacy policy, our data practices, or wish to exercise your rights,
						please contact the operator of this Freundebuch instance or reach out through the project's
						<a href="https://github.com/datenknoten/freundebuch" class="text-forest hover:text-forest-light" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
					</p>
				</section>
			</div>

			<div class="mt-10 pt-6 border-t border-gray-200">
				<a
					href="/"
					class="text-sm text-gray-500 hover:text-forest font-body flex items-center gap-1"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Home
				</a>
			</div>
		</div>
	</div>
</div>
