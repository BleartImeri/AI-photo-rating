// BuyTokensModal.tsx

import React from 'react';

const BuyTokensModal = () => {
    const tokenPackages = [
        {
            name: '100 Tokens',
            url: 'https://whop.com/joined/100-tokens-e88c/products/100-tokens-47/' // Updated URL
        },
        // Add other packages here
    ];

    return (
        <div>
            <h2>Buy Tokens</h2>
            <ul>
                {tokenPackages.map((pkg, index) => (
                    <li key={index}><a href={pkg.url}>{pkg.name}</a></li>
                ))}
            </ul>
        </div>
    );
};

export default BuyTokensModal;