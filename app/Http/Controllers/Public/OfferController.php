<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use App\Models\Offer;
use Illuminate\Http\Request;

class OfferController extends Controller
{
    public function store(Request $request, string $slug)
    {
        $gallery = Gallery::query()->where('slug', $slug)->firstOrFail();

        if ($gallery->is_sold) {
            return response()->json(['message' => 'This item is marked as sold.'], 422);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'amount' => ['required', 'numeric', 'min:0'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $offer = Offer::create([
            'gallery_id' => $gallery->id,
            ...$data,
            'status' => 'new',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // Update current offer if higher
        $current = $gallery->current_offer ? (float) $gallery->current_offer : null;
        if ($current === null || (float) $data['amount'] > $current) {
            $gallery->current_offer = $data['amount'];
            $gallery->save();
        }

        return response()->json([
            'message' => 'Offer submitted. Thank you!',
            'current_offer' => $gallery->current_offer,
        ]);
    }
}

