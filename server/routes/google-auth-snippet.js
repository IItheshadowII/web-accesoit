// Backend route for Google OAuth authentication
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'No credential provided' });
    }

    try {
        // Verify Google token (in production, verify with Google's API)
        // For now, we'll decode it and trust it (NOT SECURE for production)
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString()
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        const googleUser = JSON.parse(jsonPayload);

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email: googleUser.email }
        });

        // If not, create new user
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: googleUser.email,
                    name: googleUser.name || googleUser.email.split('@')[0],
                    password: '', // No password for Google users
                    company: null
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
